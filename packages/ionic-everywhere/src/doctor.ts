import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface CheckResult {
  name: string;
  ok: boolean;
  required: boolean;
  detail: string;
  hint?: string;
}

export function nodeMajor(version?: string): number | null {
  const m = /^v(\d+)\./.exec(version ?? "");
  return m ? Number(m[1]) : null;
}

export function javaVersion(javaExe: string): number | null {
  try {
    const out = spawnSync(javaExe, ["-version"], { encoding: "utf8" });
    const text = `${out.stderr ?? ""}${out.stdout ?? ""}`;
    const m = /(?:openjdk|java)\s+version\s+"(\d+)/i.exec(text);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

function commandExists(cmd: string): boolean {
  const probe = process.platform === "win32" ? "where" : "command";
  try {
    execFileSync(probe, process.platform === "win32" ? [cmd] : ["-v", cmd], {
      stdio: "ignore",
      shell: process.platform !== "win32",
    });
    return true;
  } catch {
    return false;
  }
}

export function runChecks(): CheckResult[] {
  const results: CheckResult[] = [];

  const nm = nodeMajor(process.version);
  results.push({
    name: "Node.js >= 20",
    ok: nm !== null && nm >= 20,
    required: true,
    detail: process.version,
    hint:
      nm !== null && nm < 20
        ? "https://nodejs.org - upgrade to Node 20 or newer"
        : undefined,
  });

  const hasBun = commandExists("bun");
  const hasNpm = commandExists("npm");
  results.push({
    name: "Package manager",
    ok: hasBun || hasNpm,
    required: true,
    detail: hasBun ? "bun available" : hasNpm ? "npm available" : "none found",
    hint:
      hasBun || hasNpm
        ? undefined
        : "Install bun (https://bun.sh) or ensure npm is on PATH",
  });

  const hasGit = commandExists("git");
  results.push({
    name: "git",
    ok: hasGit,
    required: false,
    detail: hasGit ? "available" : "not found (skipping git init)",
  });

  const javaHome = process.env.JAVA_HOME;
  const javaExe = javaHome
    ? join(javaHome, "bin", process.platform === "win32" ? "java.exe" : "java")
    : "";
  const jv = javaExe && existsSync(javaExe) ? javaVersion(javaExe) : null;
  results.push({
    name: "JDK >= 21 (Android builds)",
    ok: jv !== null && jv >= 21,
    required: false,
    detail:
      jv !== null
        ? `JAVA_HOME provides Java ${jv}`
        : javaHome
          ? "JAVA_HOME set but java not found"
          : "JAVA_HOME not set",
    hint:
      jv !== null && jv >= 21
        ? undefined
        : "Capacitor 8 requires JDK 21+: https://learn.microsoft.com/en-us/java/openjdk/download",
  });

  const androidHome =
    process.env.ANDROID_HOME ??
    join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
  const hasSdk =
    androidHome !== join("", "Android", "Sdk") && existsSync(androidHome);
  results.push({
    name: "Android SDK (Android builds)",
    ok: hasSdk,
    required: false,
    detail: hasSdk ? androidHome : "ANDROID_HOME not set",
    hint: hasSdk
      ? undefined
      : "Install Android Studio or command-line tools, then set ANDROID_HOME",
  });

  return results;
}

export function formatReport(checks: CheckResult[]): string {
  const lines: string[] = [];
  for (const c of checks) {
    const mark = c.ok ? "[ok]" : c.required ? "[FAIL]" : "[warn]";
    lines.push(`${mark} ${c.name} - ${c.detail}`);
    if (!c.ok && c.hint) lines.push(`       fix: ${c.hint}`);
  }
  return lines.join("\n");
}
