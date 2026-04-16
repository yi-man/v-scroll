import { describe, expect, it } from "vitest";
import {
  BUFFER_DEFAULT,
  calcVisibleRange,
  createVScroll,
  ensureVScrollTheme,
  registerVScroll,
} from "../src/index";

describe("package structure", () => {
  it("exports the package public api from src/index.ts", () => {
    expect(registerVScroll).toBeTypeOf("function");
    expect(ensureVScrollTheme).toBeTypeOf("function");
    expect(createVScroll).toBeTypeOf("function");
    expect(calcVisibleRange).toBeTypeOf("function");
    expect(BUFFER_DEFAULT).toBeTypeOf("number");
  });
});
