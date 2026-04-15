import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("exits cleanly without writing output when the theme source file is missing", async () => {
    await resolveConfig(root_dir);

    await expect(readFile(join(root_dir, "src/theme-imports/v-scroll.js"), "utf8")).rejects.toMatchObject({
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
});

const resolveConfig = async (root_dir: string) => {
  const plugin = vScrollThemePlugin();
  const config_resolved = plugin.configResolved;
  if (typeof config_resolved === "function") {
    await config_resolved.call(
      {} as never,
      {
        root: root_dir,
      } as never,
    );
  } else {
    await config_resolved?.handler?.call(
      {} as never,
      {
        root: root_dir,
      } as never,
    );
  }
};
