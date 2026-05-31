import { describe, it, expect, beforeAll, vi } from "vitest";
import { createTestDb } from "./seed.helper";

// Point the module's getDb() at the in-memory test database
const testDb = createTestDb();
vi.mock("../lib/db", () => ({ getDb: () => testDb }));

const { runValidation } = await import("../lib/validation");

describe("runValidation", () => {
  let result: ReturnType<typeof runValidation>;

  beforeAll(() => {
    result = runValidation();
  });

  it("returns a result object with expected keys", () => {
    expect(result).toHaveProperty("total_issues");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("infos");
    expect(result).toHaveProperty("by_rule");
    expect(result).toHaveProperty("issues");
  });

  it("counts are consistent with issues array", () => {
    expect(result.errors + result.warnings + result.infos).toBe(result.total_issues);
    expect(result.issues).toHaveLength(result.total_issues);
  });

  it("detects duplicate claim (CLM0000004 duplicates CLM0000001)", () => {
    const dupes = result.issues.filter(i => i.rule === "DUPLICATE_CLAIM");
    expect(dupes.length).toBeGreaterThanOrEqual(1);
    const claimNums = dupes.map(d => d.claim_number);
    expect(claimNums).toContain("CLM0000004");
  });

  it("detects approved amount exceeding billed (CLM0000008)", () => {
    const issues = result.issues.filter(i => i.rule === "APPROVED_EXCEEDS_BILLED");
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.map(i => i.claim_number)).toContain("CLM0000008");
  });

  it("detects future service date (CLM0000006)", () => {
    const issues = result.issues.filter(i => i.rule === "FUTURE_SERVICE_DATE");
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.map(i => i.claim_number)).toContain("CLM0000006");
  });

  it("detects submitted before service date (CLM0000007)", () => {
    const issues = result.issues.filter(i => i.rule === "SUBMITTED_BEFORE_SERVICE");
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.map(i => i.claim_number)).toContain("CLM0000007");
  });

  it("detects high-value pending claim (CLM0000005)", () => {
    const issues = result.issues.filter(i => i.rule === "HIGH_VALUE_PENDING");
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.map(i => i.claim_number)).toContain("CLM0000005");
  });

  it("error severity issues have severity=error", () => {
    const errors = result.issues.filter(i => i.severity === "error");
    expect(errors.length).toBe(result.errors);
  });

  it("by_rule entries match actual issue counts", () => {
    result.by_rule.forEach(r => {
      const actual = result.issues.filter(i => i.rule === r.rule).length;
      expect(actual).toBe(r.count);
    });
  });

  it("every issue has required fields", () => {
    result.issues.forEach(issue => {
      expect(issue).toHaveProperty("claim_id");
      expect(issue).toHaveProperty("claim_number");
      expect(issue).toHaveProperty("rule");
      expect(issue).toHaveProperty("severity");
      expect(issue).toHaveProperty("detail");
      expect(["error", "warning", "info"]).toContain(issue.severity);
    });
  });
});
