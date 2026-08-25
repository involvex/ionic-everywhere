import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  applyTokens,
  scaffold,
  templateDir,
} from "../packages/ionic-everywhere/src/scaffold";

const tempDirs: string[] = [];

function makeTemp(): string {
  const dir = mkdtempSync(join(tmpdir(), "ie-scaffold-"));
  tempDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe("templateDir", () => {
  it("points at an existing template with expected files", () => {
    const dir = templateDir();
    expect(existsSync(join(dir, "package.json"))).toBe(true);
    expect(existsSync(join(dir, "capacitor.config.ts"))).toBe(true);
    expect(existsSync(join(dir, "src", "App.tsx"))).toBe(true);
    expect(existsSync(join(dir, ".gitignore"))).toBe(true);
  });
});

describe("applyTokens", () => {
  it("replaces all tokens", () => {
    const out = applyTokens(
      '"name": "__APP_NAME_KEBAB__" __APP_NAME__ __APP_ID__',
      {
        appName: "Cool App",
        appId: "io.involvex.cool",
        nameKebab: "cool-app",
      },
    );
    expect(out).toContain("cool-app");
    expect(out).toContain("Cool App");
    expect(out).toContain("io.involvex.cool");
    expect(out).not.toContain("__APP");
  });
});

describe("scaffold", () => {
  it("copies and tokenizes into an empty target", () => {
    const target = makeTemp();
    const written = scaffold({
      targetDir: target,
      appName: "Test App",
      appId: "io.involvex.test",
      nameKebab: "test-app",
    });
    expect(written).toContain("package.json");
    const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
    expect(pkg.name).toBe("test-app");
    expect(pkg.scripts.sync).toContain("@capawesome/capacitor-electron");
    const cap = readFileSync(join(target, "capacitor.config.ts"), "utf8");
    expect(cap).toContain("io.involvex.test");
    expect(cap).not.toContain("__APP_ID__");
    expect(readdirSync(join(target, "src", "pages")).length).toBeGreaterThan(0);
  });

  it("refuses non-empty targets", () => {
    const target = makeTemp();
    scaffold({
      targetDir: target,
      appName: "First",
      appId: "io.x.first",
      nameKebab: "first",
    });
    expect(() =>
      scaffold({
        targetDir: target,
        appName: "X",
        appId: "io.x.y",
        nameKebab: "x",
      }),
    ).toThrow(/not empty/i);
  });
});
