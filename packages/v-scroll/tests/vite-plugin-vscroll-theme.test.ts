import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Plugin } from "vite";
import { vScrollThemePlugin } from "../scripts/vite-plugin-vscroll-theme";

describe("vScrollThemePlugin", () => {
  let root_dir = "";

  beforeEach(async () => {
    root_dir = await mkdtemp(join(tmpdir(), "v-scroll-plugin-"));
    await mkdir(join(root_dir, "themes/default"), { recursive: true });
  });

  afterEach(async () => {
    if (root_dir) {
      await rm(root_dir, { recursive: true, force: true });
    }
  });

  it("writes a minified javascript theme module during config resolution", async () => {
    await mkdir(join(root_dir, "src/theme-imports"), { recursive: true });
    await writeFile(
      join(root_dir, "themes/default/v-scroll.css"),
      "/* c */\n:root {\n  --color: red;\n}\n",
      "utf8",
    );

    await resolveConfig(root_dir);

    const generated_code = await readFile(join(root_dir, "src/theme-imports/v-scroll.js"), "utf8");

    expect(generated_code).toBe('export default ":root{--color:red}";\n');
  });

  it("fails closed and removes stale output when the theme source file is missing", async () => {
    await mkdir(join(root_dir, "src/theme-imports"), { recursive: true });
    await mkdir(join(root_dir, "dist/src/theme-imports"), { recursive: true });
    await writeFile(
      join(root_dir, "src/theme-imports/v-scroll.js"),
      'export default ":root{--stale:true}";\n',
      "utf8",
    );
    await writeFile(
      join(root_dir, "dist/src/theme-imports/v-scroll.js"),
      'export default ":root{--stale:true}";\n',
      "utf8",
    );

    await expect(resolveConfig(root_dir, { build: { outDir: "dist" } })).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(readFile(join(root_dir, "src/theme-imports/v-scroll.js"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(readFile(join(root_dir, "dist/src/theme-imports/v-scroll.js"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("fails closed and removes stale output when canonical css is invalid", async () => {
    await mkdir(join(root_dir, "src/theme-imports"), { recursive: true });
    await mkdir(join(root_dir, "dist/src/theme-imports"), { recursive: true });
    await writeFile(
      join(root_dir, "src/theme-imports/v-scroll.js"),
      'export default ":root{--stale:true}";\n',
      "utf8",
    );
    await writeFile(
      join(root_dir, "dist/src/theme-imports/v-scroll.js"),
      'export default ":root{--stale:true}";\n',
      "utf8",
    );
    await writeFile(join(root_dir, "themes/default/v-scroll.css"), "@import ;\n", "utf8");

    await expect(resolveConfig(root_dir, { build: { outDir: "dist" } })).rejects.toThrow();
    await expect(readFile(join(root_dir, "src/theme-imports/v-scroll.js"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(readFile(join(root_dir, "dist/src/theme-imports/v-scroll.js"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("creates the output directory before writing the generated theme module", async () => {
    await writeFile(
      join(root_dir, "themes/default/v-scroll.css"),
      "/* c */\n:root {\n  --color: red;\n}\n",
      "utf8",
    );

    await resolveConfig(root_dir);

    await expect(access(join(root_dir, "src/theme-imports"))).resolves.toBeUndefined();
    await expect(readFile(join(root_dir, "src/theme-imports/v-scroll.js"), "utf8")).resolves.toBe(
      'export default ":root{--color:red}";\n',
    );
  });

  it("keeps the generated module importable from the package by relative path", async () => {
    await writeFile(
      join(root_dir, "themes/default/v-scroll.css"),
      ":root {\n  --color: red;\n}\n",
      "utf8",
    );

    await resolveConfig(root_dir);

    await expect(readFile(join(root_dir, "src/theme-imports/v-scroll.js"), "utf8")).resolves.toBe(
      'export default ":root{--color:red}";\n',
    );
  });

  it("writes the generated theme module into the configured build output path", async () => {
    await writeFile(
      join(root_dir, "themes/default/v-scroll.css"),
      "/* c */\n:root {\n  --color: red;\n}\n",
      "utf8",
    );

    const plugin = vScrollThemePlugin();
    await callHook(plugin, "configResolved", {
      root: root_dir,
      build: {
        outDir: "dist",
      },
    });
    await callHook(plugin, "writeBundle");

    await expect(readFile(join(root_dir, "dist/src/theme-imports/v-scroll.js"), "utf8")).resolves.toBe(
      'export default ":root{--color:red}";\n',
    );
  });

  it("regenerates the generated source module and reloads when the theme css changes in dev", async () => {
    const source_path = join(root_dir, "themes/default/v-scroll.css");
    await writeFile(source_path, ":root {\n  --color: red;\n}\n", "utf8");

    const plugin = vScrollThemePlugin();
    await callHook(plugin, "configResolved", {
      root: root_dir,
      build: {
        outDir: "dist",
      },
    });

    let on_change: ((changed_path: string) => Promise<void> | void) | undefined;
    const add = vi.fn();
    const send = vi.fn();

    await callHook(plugin, "configureServer", {
      watcher: {
        add,
        on: (event_name: string, handler: (changed_path: string) => Promise<void> | void) => {
          if (event_name === "change") {
            on_change = handler;
          }
        },
      },
      ws: {
        send,
      },
    });

    await writeFile(source_path, ":root {\n  --color: blue;\n}\n", "utf8");
    await on_change?.(source_path);

    expect(add).toHaveBeenCalledWith(source_path);
    expect(send).toHaveBeenCalledWith({ type: "full-reload" });
    await expect(readFile(join(root_dir, "src/theme-imports/v-scroll.js"), "utf8")).resolves.toBe(
      'export default ":root{--color:blue}";\n',
    );
  });

  it("removes stale output and reloads when the theme css is deleted in dev", async () => {
    const source_path = join(root_dir, "themes/default/v-scroll.css");
    await writeFile(source_path, ":root {\n  --color: red;\n}\n", "utf8");

    const plugin = vScrollThemePlugin();
    await callHook(plugin, "configResolved", {
      root: root_dir,
      build: {
        outDir: "dist",
      },
      command: "serve",
    });
    await callHook(plugin, "writeBundle");

    let on_unlink: ((changed_path: string) => Promise<void> | void) | undefined;
    const add = vi.fn();
    const send = vi.fn();

    await callHook(plugin, "configureServer", {
      watcher: {
        add,
        on: (event_name: string, handler: (changed_path: string) => Promise<void> | void) => {
          if (event_name === "unlink") {
            on_unlink = handler;
          }
        },
      },
      ws: {
        send,
      },
    });

    await rm(source_path);
    await on_unlink?.(source_path);

    expect(add).toHaveBeenCalledWith(source_path);
    expect(send).toHaveBeenCalledWith({ type: "full-reload" });
    await expect(readFile(join(root_dir, "src/theme-imports/v-scroll.js"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(readFile(join(root_dir, "dist/src/theme-imports/v-scroll.js"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("regenerates the generated source module and reloads when the theme css is restored in dev", async () => {
    const source_path = join(root_dir, "themes/default/v-scroll.css");
    await writeFile(source_path, ":root {\n  --color: red;\n}\n", "utf8");

    const plugin = vScrollThemePlugin();
    await callHook(plugin, "configResolved", {
      root: root_dir,
      build: {
        outDir: "dist",
      },
      command: "serve",
    });

    let on_add: ((changed_path: string) => Promise<void> | void) | undefined;
    const add = vi.fn();
    const send = vi.fn();

    await callHook(plugin, "configureServer", {
      watcher: {
        add,
        on: (event_name: string, handler: (changed_path: string) => Promise<void> | void) => {
          if (event_name === "add") {
            on_add = handler;
          }
        },
      },
      ws: {
        send,
      },
    });

    await rm(source_path);
    await writeFile(source_path, ":root {\n  --color: green;\n}\n", "utf8");
    await on_add?.(source_path);

    expect(add).toHaveBeenCalledWith(source_path);
    expect(send).toHaveBeenCalledWith({ type: "full-reload" });
    await expect(readFile(join(root_dir, "src/theme-imports/v-scroll.js"), "utf8")).resolves.toBe(
      'export default ":root{--color:green}";\n',
    );
  });

  it("removes stale output, reloads, and surfaces errors when invalid theme css is seen in dev", async () => {
    const source_path = join(root_dir, "themes/default/v-scroll.css");

    for (const event_name of ["change", "add"] as const) {
      await rm(join(root_dir, "src"), { recursive: true, force: true });
      await rm(join(root_dir, "dist"), { recursive: true, force: true });
      await writeFile(source_path, ":root {\n  --color: red;\n}\n", "utf8");

      const plugin = vScrollThemePlugin();
      await callHook(plugin, "configResolved", {
        root: root_dir,
        build: {
          outDir: "dist",
        },
        command: "serve",
      });
      await callHook(plugin, "writeBundle");

      let handler: ((changed_path: string) => Promise<void> | void) | undefined;
      const add = vi.fn();
      const send = vi.fn();

      await callHook(plugin, "configureServer", {
        watcher: {
          add,
          on: (registered_event_name: string, registered_handler: (changed_path: string) => Promise<void> | void) => {
            if (registered_event_name === event_name) {
              handler = registered_handler;
            }
          },
        },
        ws: {
          send,
        },
      });

      await writeFile(source_path, "@import ;\n", "utf8");

      await expect(handler?.(source_path)).rejects.toThrow();
      expect(add).toHaveBeenCalledWith(source_path);
      expect(send).toHaveBeenCalledWith({ type: "full-reload" });
      await expect(readFile(join(root_dir, "src/theme-imports/v-scroll.js"), "utf8")).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(readFile(join(root_dir, "dist/src/theme-imports/v-scroll.js"), "utf8")).rejects.toMatchObject({
        code: "ENOENT",
      });
    }
  });
});

const resolveConfig = async (
  root_dir: string,
  config: {
    build?: {
      outDir?: string;
    };
  } = {},
) => {
  const plugin = vScrollThemePlugin();
  await callHook(plugin, "configResolved", {
    root: root_dir,
    ...config,
  });
};

const callHook = async (
  plugin: Plugin,
  hook_name: keyof Plugin,
  ...args: unknown[]
) => {
  const hook = plugin[hook_name];

  if (typeof hook === "function") {
    return await hook.call({} as never, ...args);
  }

  return await hook?.handler?.call({} as never, ...args);
};
