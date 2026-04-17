import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readJson = async <T>(path: string) =>
  JSON.parse(await readFile(resolve(process.cwd(), path), "utf8")) as T;

describe("workspace orchestration", () => {
  it("defines workspaces and explicit layered scripts at the root", async () => {
    const pkg = await readJson<{
      private: boolean;
      workspaces: string[];
      scripts: Record<string, string>;
    }>("package.json");

    expect(pkg.private).toBe(true);
    expect(pkg.workspaces).toEqual(["apps/*", "packages/*"]);
    expect(pkg.scripts["dev:demo"]).toBe(
      "bun run build:lib && bun run --cwd apps/demo dev",
    );
    expect(pkg.scripts["build:lib"]).toBe("bun run --cwd packages/v-scroll build");
    expect(pkg.scripts["build:demo"]).toBe(
      "test -f packages/v-scroll/dist/index.js && bun run --cwd apps/demo build",
    );
    expect(pkg.scripts.build).toBe("bun run build:lib && bun run build:demo");
    expect(pkg.scripts.check).toBe(
      "bun run --cwd packages/v-scroll check && bun run --cwd apps/demo check",
    );
    expect(pkg.scripts.test).toBe(
      "bun run test:workspace-config && bun run --cwd packages/v-scroll test && bun run --cwd apps/demo test",
    );
  });

  it("declares dedicated manifests for the demo and package", async () => {
    const demo_pkg = await readJson<{
        name: string;
        private: boolean;
        dependencies: Record<string, string>;
      }>("apps/demo/package.json"),
      lib_pkg = await readJson<{
        name: string;
        type: string;
        exports: Record<string, unknown>;
      }>("packages/v-scroll/package.json");

    expect(demo_pkg.name).toBe("v-scroll-demo");
    expect(demo_pkg.private).toBe(true);
    expect(demo_pkg.dependencies["v-scroll"]).toBe("workspace:*");
    expect(lib_pkg.name).toBe("v-scroll");
    expect(lib_pkg.type).toBe("module");
    expect(lib_pkg.exports["."]).toEqual({
      import: "./dist/index.js",
      types: "./dist/index.d.ts",
    });
  });

  it("points vercel and the build gate at the demo output", async () => {
    const vercel = await readJson<{
        buildCommand: string;
        outputDirectory: string;
      }>("vercel.json"),
      build_sh = await readFile(resolve(process.cwd(), "build.sh"), "utf8");

    expect(vercel.buildCommand).toBe("bun run build");
    expect(vercel.outputDirectory).toBe("apps/demo/dist");
    expect(build_sh).toContain("bun run check");
    expect(build_sh).toContain("bun run test");
    expect(build_sh).toContain("bun run build");
    expect(build_sh.indexOf("bun run check")).toBeLessThan(
      build_sh.indexOf("bun run test"),
    );
    expect(build_sh.indexOf("bun run test")).toBeLessThan(
      build_sh.indexOf("bun run build"),
    );
  });
});
