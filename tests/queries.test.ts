import { describe, it, expect, vi } from "vitest";
import { createTestDb } from "./seed.helper";

const testDb = createTestDb();
vi.mock("../lib/db", () => ({ getDb: () => testDb }));

const { getDashboardStats, getClaims, getClaimById } = await import("../lib/queries");

describe("getDashboardStats", () => {
  it("returns correct total claim count", () => {
    const s = getDashboardStats();
    expect(s.total_claims).toBe(10);
  });

  it("total_billed matches sum of fixture amounts", () => {
    const s = getDashboardStats();
    const expected = 500+1200+250+500+25000+300+800+600+150+90;
    expect(s.total_billed).toBe(expected);
  });

  it("approval_rate is between 0 and 100", () => {
    const s = getDashboardStats();
    expect(s.approval_rate).toBeGreaterThanOrEqual(0);
    expect(s.approval_rate).toBeLessThanOrEqual(100);
  });

  it("denial_rate is between 0 and 100", () => {
    const s = getDashboardStats();
    expect(s.denial_rate).toBeGreaterThanOrEqual(0);
    expect(s.denial_rate).toBeLessThanOrEqual(100);
  });

  it("by_status covers all statuses present in fixtures", () => {
    const s = getDashboardStats();
    const statuses = s.by_status.map(r => r.status);
    expect(statuses).toContain("approved");
    expect(statuses).toContain("denied");
    expect(statuses).toContain("submitted");
  });

  it("by_type counts sum to total claims", () => {
    const s = getDashboardStats();
    const sum = s.by_type.reduce((a, r) => a + r.count, 0);
    expect(sum).toBe(s.total_claims);
  });

  it("monthly_trend entries have required fields", () => {
    const s = getDashboardStats();
    s.monthly_trend.forEach(m => {
      expect(m).toHaveProperty("month");
      expect(m).toHaveProperty("submitted");
      expect(m).toHaveProperty("approved");
      expect(m).toHaveProperty("denied");
      expect(m).toHaveProperty("billed");
    });
  });
});

describe("getClaims", () => {
  it("returns all 10 claims with no filters", () => {
    const r = getClaims();
    expect(r.total).toBe(10);
    expect(r.data.length).toBe(10);
  });

  it("filters by status=approved", () => {
    const r = getClaims({ status: "approved" });
    expect(r.total).toBe(3); // CLM0000001, CLM0000008, CLM0000009
    r.data.forEach(c => expect(c.status).toBe("approved"));
  });

  it("filters by claim_type=dental", () => {
    const r = getClaims({ claim_type: "dental" });
    r.data.forEach(c => expect(c.claim_type).toBe("dental"));
    expect(r.total).toBe(2); // CLM0000002 and CLM0000009
  });

  it("search by patient name returns matching claims", () => {
    const r = getClaims({ search: "Alice" });
    expect(r.total).toBeGreaterThanOrEqual(1);
    r.data.forEach(c => expect(c.patient_name.toLowerCase()).toContain("alice"));
  });

  it("search by claim number works", () => {
    const r = getClaims({ search: "CLM0000001" });
    expect(r.total).toBe(1);
    expect(r.data[0].claim_number).toBe("CLM0000001");
  });

  it("pagination returns correct page size", () => {
    const r = getClaims({ page: 1, pageSize: 5 });
    expect(r.data.length).toBe(5);
    expect(r.total).toBe(10);
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(5);
  });

  it("page 2 returns remaining records", () => {
    const r = getClaims({ page: 2, pageSize: 7 });
    expect(r.data.length).toBe(3);
  });

  it("flagged=true returns only flagged claims", () => {
    const r = getClaims({ flagged: true });
    expect(r.total).toBe(1);
    r.data.forEach(c => expect(c.flags).not.toBeNull());
  });

  it("date range filter works", () => {
    const r = getClaims({ dateFrom: "2024-02-01", dateTo: "2024-03-31" });
    r.data.forEach(c => {
      expect(c.service_date >= "2024-02-01").toBe(true);
      expect(c.service_date <= "2024-03-31").toBe(true);
    });
  });

  it("sortDir=asc returns ascending billed_amount", () => {
    const r = getClaims({ sortBy: "billed_amount", sortDir: "asc" });
    const amounts = r.data.map(c => c.billed_amount);
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i - 1]);
    }
  });
});

describe("getClaimById", () => {
  it("returns the correct claim", () => {
    const claim = getClaimById(1);
    expect(claim).not.toBeNull();
    expect(claim!.claim_number).toBe("CLM0000001");
    expect(claim!.patient_name).toBe("Alice Brown");
  });

  it("returns null/undefined for a non-existent id", () => {
    const claim = getClaimById(99999);
    expect(claim).toBeFalsy();
  });

  it("returned claim has all expected fields", () => {
    const claim = getClaimById(1);
    expect(claim).toMatchObject({
      claim_number:    expect.any(String),
      patient_name:    expect.any(String),
      patient_id:      expect.any(String),
      provider_name:   expect.any(String),
      billed_amount:   expect.any(Number),
      status:          expect.any(String),
      claim_type:      expect.any(String),
      service_date:    expect.any(String),
      submitted_date:  expect.any(String),
    });
  });
});
