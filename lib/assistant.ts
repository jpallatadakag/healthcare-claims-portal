import { getDb } from "./db";

export interface AssistantResponse {
  answer: string;
  data?: Record<string, unknown>[];
  chart?: { type: "bar" | "stat"; labels: string[]; values: number[] };
}

function fmt$(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtN(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

// ── Rule-based intent matching ────────────────────────────────────────────────

type Rule = { patterns: RegExp[]; handler: (q: string) => AssistantResponse };

function makeRules(db: ReturnType<typeof getDb>): Rule[] {
  return [
    // Total claims
    {
      patterns: [/how many claims/i, /total (number of )?claims/i, /claim count/i],
      handler: () => {
        const r = db.prepare("SELECT COUNT(*) as n, ROUND(SUM(billed_amount),2) as total FROM claims").get() as any;
        return {
          answer: `There are **${fmtN(r.n)} total claims** with a combined billed amount of **${fmt$(r.total)}**.`,
        };
      },
    },

    // Approval rate
    {
      patterns: [/approval rate/i, /what.*approved/i, /how many.*approved/i, /approved claims/i],
      handler: () => {
        const r = db.prepare(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved,
            ROUND(100.0 * SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) / COUNT(*), 1) as rate
          FROM claims
        `).get() as any;
        return {
          answer: `**${fmtN(r.approved)}** out of **${fmtN(r.total)}** claims are approved — an approval rate of **${r.rate}%**.`,
        };
      },
    },

    // Denial rate / denied
    {
      patterns: [/denial rate/i, /denied claims/i, /how many.*denied/i, /what.*denied/i],
      handler: () => {
        const r = db.prepare(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status='denied' THEN 1 ELSE 0 END) as denied,
            ROUND(100.0 * SUM(CASE WHEN status='denied' THEN 1 ELSE 0 END) / COUNT(*), 1) as rate,
            ROUND(SUM(CASE WHEN status='denied' THEN billed_amount ELSE 0 END),2) as denied_amount
          FROM claims
        `).get() as any;
        return {
          answer: `**${fmtN(r.denied)}** claims have been denied (**${r.rate}%** denial rate), representing **${fmt$(r.denied_amount)}** in billed charges.`,
        };
      },
    },

    // Flagged / anomalies
    {
      patterns: [/flagged/i, /anomal/i, /suspicious/i, /flags/i],
      handler: () => {
        const r = db.prepare(`
          SELECT COUNT(*) as n, ROUND(SUM(billed_amount),2) as amount FROM claims WHERE flags IS NOT NULL
        `).get() as any;
        const breakdown = db.prepare(`
          SELECT flags, COUNT(*) as cnt FROM claims WHERE flags IS NOT NULL GROUP BY flags ORDER BY cnt DESC LIMIT 5
        `).all() as any[];
        const lines = breakdown.map(b => `- \`${b.flags}\`: ${b.cnt} claims`).join("\n");
        return {
          answer: `**${fmtN(r.n)} claims** are flagged (${fmt$(r.amount)} billed).\n\nTop flags:\n${lines}`,
        };
      },
    },

    // Top providers
    {
      patterns: [/top provider/i, /highest.*provider/i, /provider.*most/i, /which provider/i],
      handler: () => {
        const rows = db.prepare(`
          SELECT provider_name, COUNT(*) as claims, ROUND(SUM(billed_amount),2) as billed
          FROM claims GROUP BY provider_name ORDER BY billed DESC LIMIT 5
        `).all() as any[];
        const lines = rows.map((r, i) => `${i + 1}. **${r.provider_name}** — ${fmtN(r.claims)} claims, ${fmt$(r.billed)} billed`).join("\n");
        return {
          answer: `Top 5 providers by billed amount:\n\n${lines}`,
          chart: {
            type: "bar",
            labels: rows.map(r => r.provider_name.replace("Dr. ", "")),
            values: rows.map(r => r.billed),
          },
        };
      },
    },

    // Top patients
    {
      patterns: [/top patient/i, /patient.*most claims/i, /highest.*patient/i, /which patient/i],
      handler: () => {
        const rows = db.prepare(`
          SELECT patient_name, COUNT(*) as claims, ROUND(SUM(billed_amount),2) as billed
          FROM claims GROUP BY patient_name ORDER BY claims DESC LIMIT 5
        `).all() as any[];
        const lines = rows.map((r, i) => `${i + 1}. **${r.patient_name}** — ${fmtN(r.claims)} claims, ${fmt$(r.billed)} billed`).join("\n");
        return { answer: `Top 5 patients by claim count:\n\n${lines}` };
      },
    },

    // Claims by type
    {
      patterns: [/by type/i, /claim type/i, /types of claim/i, /breakdown.*type/i],
      handler: () => {
        const rows = db.prepare(`
          SELECT claim_type, COUNT(*) as cnt, ROUND(SUM(billed_amount),2) as billed
          FROM claims GROUP BY claim_type ORDER BY cnt DESC
        `).all() as any[];
        const lines = rows.map(r => `- **${r.claim_type.replace("_", " ")}**: ${fmtN(r.cnt)} claims · ${fmt$(r.billed)}`).join("\n");
        return {
          answer: `Claims by type:\n\n${lines}`,
          chart: {
            type: "bar",
            labels: rows.map(r => r.claim_type.replace("_", " ")),
            values: rows.map(r => r.cnt),
          },
        };
      },
    },

    // Claims by insurance
    {
      patterns: [/by insur/i, /insurer/i, /insurance company/i, /which insur/i],
      handler: () => {
        const rows = db.prepare(`
          SELECT insurance, COUNT(*) as cnt, ROUND(SUM(billed_amount),2) as billed
          FROM claims GROUP BY insurance ORDER BY billed DESC LIMIT 6
        `).all() as any[];
        const lines = rows.map(r => `- **${r.insurance}**: ${fmtN(r.cnt)} claims · ${fmt$(r.billed)}`).join("\n");
        return { answer: `Claims by insurer:\n\n${lines}` };
      },
    },

    // Average billed amount
    {
      patterns: [/average.*billed/i, /avg.*claim/i, /mean.*claim/i, /average claim/i],
      handler: () => {
        const r = db.prepare(`
          SELECT ROUND(AVG(billed_amount),2) as avg_billed,
                 ROUND(AVG(COALESCE(approved_amount,0)),2) as avg_approved
          FROM claims
        `).get() as any;
        return {
          answer: `The average billed amount per claim is **${fmt$(r.avg_billed)}**, and the average approved amount is **${fmt$(r.avg_approved)}**.`,
        };
      },
    },

    // Total billed / total paid
    {
      patterns: [/total billed/i, /total amount/i, /how much.*billed/i, /billed amount/i],
      handler: () => {
        const r = db.prepare(`
          SELECT ROUND(SUM(billed_amount),2) as billed,
                 ROUND(SUM(COALESCE(approved_amount,0)),2) as approved,
                 ROUND(SUM(COALESCE(paid_amount,0)),2) as paid
          FROM claims
        `).get() as any;
        return {
          answer: `**Total billed**: ${fmt$(r.billed)}\n**Total approved**: ${fmt$(r.approved)}\n**Total paid out**: ${fmt$(r.paid)}`,
        };
      },
    },

    // High value claims
    {
      patterns: [/high.value/i, /large claims/i, /expensive/i, /claims over/i, /biggest claims/i],
      handler: () => {
        const rows = db.prepare(`
          SELECT claim_number, patient_name, provider_name, billed_amount, status
          FROM claims ORDER BY billed_amount DESC LIMIT 5
        `).all() as any[];
        const lines = rows.map(r =>
          `- **${r.claim_number}** · ${r.patient_name} · ${fmt$(r.billed_amount)} · ${r.status}`
        ).join("\n");
        return { answer: `Top 5 highest-value claims:\n\n${lines}` };
      },
    },

    // Pending / under review
    {
      patterns: [/pending/i, /under review/i, /not.*resolved/i, /open claims/i],
      handler: () => {
        const r = db.prepare(`
          SELECT
            SUM(CASE WHEN status='submitted'    THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status='under_review' THEN 1 ELSE 0 END) as under_review,
            SUM(CASE WHEN status='appealed'     THEN 1 ELSE 0 END) as appealed,
            ROUND(SUM(CASE WHEN status IN ('submitted','under_review','appealed') THEN billed_amount ELSE 0 END),2) as amount
          FROM claims
        `).get() as any;
        return {
          answer: `Open / unresolved claims:\n- **Submitted**: ${fmtN(r.submitted)}\n- **Under review**: ${fmtN(r.under_review)}\n- **Appealed**: ${fmtN(r.appealed)}\n\nTotal billed at risk: **${fmt$(r.amount)}**`,
        };
      },
    },

    // Duplicate claims
    {
      patterns: [/duplicate/i, /dupes/i],
      handler: () => {
        const r = db.prepare(`
          SELECT COUNT(*) as n FROM claims c
          WHERE EXISTS (
            SELECT 1 FROM claims c2
            WHERE c2.patient_id=c.patient_id AND c2.provider_npi=c.provider_npi
              AND c2.service_date=c.service_date AND c2.procedure_codes=c.procedure_codes
              AND c2.id < c.id
          )
        `).get() as any;
        return {
          answer: r.n > 0
            ? `**${fmtN(r.n)} potential duplicate claims** detected (same patient, provider, service date, and procedure codes). Review the Validation page for details.`
            : `No duplicate claims detected.`,
        };
      },
    },

    // Mental health
    {
      patterns: [/mental health/i, /psychiatr/i, /behavioral/i],
      handler: () => {
        const r = db.prepare(`
          SELECT COUNT(*) as cnt, ROUND(SUM(billed_amount),2) as billed,
            ROUND(100.0*SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END)/COUNT(*),1) as approval_rate
          FROM claims WHERE claim_type='mental_health'
        `).get() as any;
        return {
          answer: `Mental health claims: **${fmtN(r.cnt)}** claims totalling **${fmt$(r.billed)}** with an approval rate of **${r.approval_rate}%**.`,
        };
      },
    },

    // Help / what can you do
    {
      patterns: [/help/i, /what can you/i, /what do you know/i, /capabilities/i, /commands/i],
      handler: () => ({
        answer: `I can answer questions like:\n\n- How many claims are there?\n- What is the approval / denial rate?\n- Show claims by type or insurer\n- Who are the top providers or patients?\n- What is the total billed / paid?\n- Are there any duplicate or flagged claims?\n- What are the highest-value claims?\n- How many claims are pending or under review?\n- What is the average claim amount?\n- Tell me about mental health claims`,
      }),
    },
  ];
}

export function queryAssistant(question: string): AssistantResponse {
  const db = getDb();
  const rules = makeRules(db);

  for (const rule of rules) {
    if (rule.patterns.some(p => p.test(question))) {
      try {
        return rule.handler(question);
      } catch {
        return { answer: "I encountered an error running that query. Please try rephrasing." };
      }
    }
  }

  return {
    answer: `I'm not sure how to answer that yet. Try asking about:\n- Approval or denial rates\n- Claims by type, insurer, or status\n- Top providers or patients\n- Flagged or duplicate claims\n\nType **help** to see all supported questions.`,
  };
}
