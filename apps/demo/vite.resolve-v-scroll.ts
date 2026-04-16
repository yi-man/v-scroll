import { resolve } from "node:path";
import type { Alias } from "vite";

const LIB_SOURCE_ENTRY = resolve(
  __dirname,
  "../../packages/v-scroll/src/index.ts",
);

export const getVScrollAlias = (command: "serve" | "build"): Alias[] =>
  command === "serve"
    ? [{ find: "v-scroll", replacement: LIB_SOURCE_ENTRY }]
    : [];
