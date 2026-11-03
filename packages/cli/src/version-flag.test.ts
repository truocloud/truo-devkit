import { describe, expect, it } from "bun:test";
import { takesVersionFlag } from "./index.ts";

describe("--version", () => {
  it("is the command's own flag when the command declares it", () => {
    expect(takesVersionFlag(["caas", "stack", "rollback", "svc_1", "web"])).toBe(true);
  });
  it("stays global everywhere else", () => {
    expect(takesVersionFlag([])).toBe(false);
    expect(takesVersionFlag(["caas", "stack", "list", "svc_1"])).toBe(false);
    expect(takesVersionFlag(["nope"])).toBe(false);
  });
});
