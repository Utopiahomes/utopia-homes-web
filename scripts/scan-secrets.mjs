import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([
  ".git",
  ".astro",
  ".pytest_cache",
  ".ruff_cache",
  ".venv",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const textExtensions = new Set([
  ".astro",
  ".css",
  ".html",
  ".ini",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".py",
  ".sql",
  ".toml",
  ".ts",
  ".txt",
  ".yaml",
  ".yml",
]);
const patterns = [
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["OpenAI-style secret", /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ["Resend API key", /\bre_[A-Za-z0-9]{16,}\b/],
  ["Webhook signing secret", /\bwhsec_[A-Za-z0-9+/=]{16,}\b/],
  ["Private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GitHub token", /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/],
  ["PostgreSQL credential URL", /postgres(?:ql)?(?:\+\w+)?:\/\/[^\s:]+:[^\s@]+@/],
];
const allowedFixtureMarkers = /PLACEHOLDER|test-only|re_test|example\.com|configured|\.\.\./i;

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (textExtensions.has(extname(entry.name)) || entry.name.startsWith(".env.example")) files.push(path);
  }
  return files;
}

const findings = [];
for (const file of await collectFiles(root)) {
  if (file.endsWith("pnpm-lock.yaml")) continue;
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (allowedFixtureMarkers.test(line)) return;
    for (const [label, pattern] of patterns) {
      if (pattern.test(line)) {
        findings.push(`${relative(root, file)}:${index + 1}: possible ${label}`);
      }
    }
  });
}

if (findings.length) {
  console.error(findings.join("\n"));
  process.exit(1);
}
console.log("No secret-shaped values found in source files.");
