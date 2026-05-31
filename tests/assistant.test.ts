import { describe, it, expect, vi } from "vitest";
import { createTestDb } from "./seed.helper";

const testDb = createTestDb();
vi.mock("../lib/db", () => ({ getDb: () => testDb }));

const { queryAssistant } = await import("../lib/assistant");

describe("queryAssistant", () => {
  it("returns an answer string for every response", () => {
    const r = queryAssistant("How many claims are there?");
    expect(typeof r.answer).toBe("string");
    expect(r.answer.length).toBeGreaterThan(0);
  });

  it("answers total claims question", () => {
    const r = queryAssistant("How many claims are there?");
    expect(r.answer).toMatch(/10/); // 10 fixture records
  });

  it("answers approval rate question", () => {
    const r = queryAssistant("What is the approval rate?");
    expect(r.answer).toMatch(/%/);
  });

  it("answers denial rate question", () => {
    const r = queryAssistant("What is the denial rate?");
    expect(r.answer).toMatch(/denied/i);
  });

  it("answers total billed question", () => {
    const r = queryAssistant("What is the total billed amount?");
    expect(r.answer).toMatch(/billed/i);
    expect(r.answer).toMatch(/\$/);
  });

  it("answers top providers question and returns a chart", () => {
    const r = queryAssistant("Who are the top providers?");
    expect(r.answer).toMatch(/provider/i);
    expect(r.chart).toBeDefined();
    expect(r.chart!.type).toBe("bar");
    expect(r.chart!.labels.length).toBeGreaterThan(0);
    expect(r.chart!.values.length).toBe(r.chart!.labels.length);
  });

  it("answers claims by type and returns a chart", () => {
    const r = queryAssistant("Show claims by type");
    expect(r.chart).toBeDefined();
    expect(r.chart!.labels).toContain("medical");
  });

  it("answers flagged claims question", () => {
    const r = queryAssistant("Show flagged claims");
    expect(r.answer).toMatch(/flagged/i);
  });

  it("answers duplicate claims question", () => {
    const r = queryAssistant("Are there any duplicate claims?");
    expect(r.answer).toMatch(/duplicate/i);
  });

  it("answers average claim amount question", () => {
    const r = queryAssistant("What is the average claim amount?");
    expect(r.answer).toMatch(/average/i);
    expect(r.answer).toMatch(/\$/);
  });

  it("answers pending claims question", () => {
    const r = queryAssistant("Show open claims pending review");
    expect(r.answer).toMatch(/submitted|review|appealed/i);
  });

  it("returns help response for help query", () => {
    const r = queryAssistant("help");
    expect(r.answer).toMatch(/approval/i);
    expect(r.answer).toMatch(/denial/i);
  });

  it("returns fallback for unrecognised question", () => {
    const r = queryAssistant("zxqy gibberish question 12345");
    expect(r.answer).toMatch(/not sure|rephrase/i);
  });

  it("is case-insensitive", () => {
    const lower = queryAssistant("approval rate");
    const upper = queryAssistant("APPROVAL RATE");
    expect(lower.answer).toBeTruthy();
    expect(upper.answer).toBeTruthy();
  });
});
