import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface ScaffoldOptions {
  targetDir: string;
  appName: string;
  appId: string;
  nameKebab: string;
}

export function templateDir(): string {
  return join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "templates",
    "default",
  );
}

const TEXT_FILES = ["package.json", "capacitor.config.ts", "index.html"];

export function applyTokens(
  content: string,
  opts: Pick<ScaffoldOptions, "appName" | "appId" | "nameKebab">,
): string {
  return content
    .replaceAll("__APP_NAME__", opts.appName)
    .replaceAll("__APP_ID__", opts.appId)
    .replaceAll("__APP_NAME_KEBAB__", opts.nameKebab);
}

export function assertEmptyTarget(targetDir: string): void {
  if (!existsSync(targetDir)) return;
  const entries = readdirSync(targetDir);
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${targetDir}`);
  }
}

export function scaffold(opts: ScaffoldOptions): string[] {
  assertEmptyTarget(opts.targetDir);
  cpSync(templateDir(), opts.targetDir, { recursive: true });
  const written: string[] = [];
  for (const file of TEXT_FILES) {
    const path = join(opts.targetDir, file);
    if (!existsSync(path)) continue;
    writeFileSync(path, applyTokens(readFileSync(path, "utf8"), opts));
    written.push(file);
  }
  return written;
}
