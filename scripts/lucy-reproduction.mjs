#!/usr/bin/env node
// Synthetic browser reproduction harness for Public Lucy's guest-experience conversation.
//
// This is deliberately separate from `pnpm e2e` (product pass/fail Playwright specs).
// It drives the real widget in a real browser against an explicit, caller-supplied base
// URL, and writes what it observed to disk for a human to compare against a live report.
// It never assumes a hostname and never contains or records a credential: the browser
// itself is never given a Cloud bearer, and this script does not collect request headers
// (which would include the visitor's session cookie) or response Set-Cookie values --
// only the JSON request/response bodies and an explicit allowlist of response headers.
//
// Usage:
//   LUCY_REPRODUCTION_BASE_URL=http://127.0.0.1:3000 node scripts/lucy-reproduction.mjs [sequence|individual|both]
//
// Output:
//   .artifacts/lucy-reproduction/<timestamp>/manifest.json
//   .artifacts/lucy-reproduction/<timestamp>/sequence.json
//   .artifacts/lucy-reproduction/<timestamp>/individual-0N.json
//   .artifacts/lucy-reproduction/<timestamp>/screenshots/*.png

import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The three questions from the owner-reported acceptance examples. Order matters for the
// sequence run: it is the exact conversation that was reported live.
const QUESTIONS = [
  "What makes a Utopia stay different?",
  "How many properties do you manage?",
  "Where is a good spot to get coffee in Wildwood?",
];

// Response headers are safe to keep verbatim once present; everything else (notably
// Set-Cookie) is dropped by never being on this list.
const SAFE_RESPONSE_HEADER_ALLOWLIST = [
  "content-type",
  "cache-control",
  "x-lucy-trace-id",
  "x-lucy-cloud-release",
  "x-lucy-snapshot-version",
  "x-lucy-snapshot-digest",
  "x-utopia-website-build",
];

function redactResponseHeaders(headers) {
  const kept = {};
  for (const name of SAFE_RESPONSE_HEADER_ALLOWLIST) {
    if (headers[name] !== undefined) kept[name] = headers[name];
  }
  return kept;
}

function parsePostData(request) {
  try {
    const raw = request.postData();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return { parseError: true };
  }
}

function attachConsoleCapture(page) {
  const entries = [];
  page.on("console", (message) => {
    if (message.type() === "error") entries.push(message.text());
  });
  page.on("pageerror", (error) => entries.push(String(error)));
  return entries;
}

async function openWidget(page) {
  const launcher = page.getByRole("button", { name: "Ask Lucy" });
  await launcher.waitFor({ state: "visible", timeout: 15_000 });
  await launcher.click();
  const dialog = page.getByRole("dialog", { name: "Ask Lucy" });
  await dialog.waitFor({ state: "visible", timeout: 5_000 });
  const greeting = await page.locator(".lucy-message-lucy p").first().innerText();
  return greeting;
}

async function askQuestion(page, question) {
  const startedAt = Date.now();
  await page.getByLabel("Ask Lucy a question").fill(question);
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().includes("/api/lucy"), { timeout: 20_000 }),
    page.getByRole("button", { name: "Send" }).click(),
  ]);
  const elapsedMs = Date.now() - startedAt;
  const responseBody = await response.json().catch(() => null);
  const requestBody = parsePostData(response.request());

  // Give React a beat to paint the new message before reading the DOM.
  await page.waitForTimeout(50);
  const lastMessage = page.locator(".lucy-message-lucy").last();
  const answerText = await lastMessage.locator("p").first().innerText().catch(() => null);
  const sourcesContainerPresent = (await lastMessage.locator('[aria-label="Sources"]').count()) > 0;
  const usefulLinksContainerPresent = (await lastMessage.locator('[aria-label="Useful links"]').count()) > 0;
  const sourceAnchors = await lastMessage
    .locator('[aria-label="Sources"] a')
    .evaluateAll((elements) => elements.map((el) => ({ text: el.textContent?.trim() ?? "", href: el.getAttribute("href") })));
  const usefulLinkAnchors = await lastMessage
    .locator('[aria-label="Useful links"] a')
    .evaluateAll((elements) => elements.map((el) => ({ text: el.textContent?.trim() ?? "", href: el.getAttribute("href") })));

  return {
    question,
    elapsedMs,
    status: response.status(),
    responseHeaders: redactResponseHeaders(response.headers()),
    requestBody,
    responseBody,
    rendered: {
      answerText,
      sourcesContainerPresent,
      usefulLinksContainerPresent,
      sourceAnchors,
      usefulLinkAnchors,
    },
  };
}

async function withFreshPage(browser, baseUrl, run) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = attachConsoleCapture(page);
  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    return await run(page, consoleErrors);
  } finally {
    await context.close();
  }
}

async function runSequence(browser, baseUrl, runDir) {
  return withFreshPage(browser, baseUrl, async (page, consoleErrors) => {
    const greeting = await openWidget(page);
    const turns = [];
    for (const question of QUESTIONS) {
      turns.push(await askQuestion(page, question));
    }
    await page.screenshot({ path: path.join(runDir, "screenshots", "sequence.png") });
    return {
      mode: "sequence",
      baseUrl,
      greeting,
      // The first request's history must be empty: the greeting has message id 0 and is
      // never sent to the model, per docs/lucy-public-integration.md.
      greetingExcludedFromFirstRequestHistory: (turns[0]?.requestBody?.history ?? null)?.length === 0,
      turns,
      consoleErrors,
    };
  });
}

async function runIndividual(browser, baseUrl, runDir, index, question) {
  return withFreshPage(browser, baseUrl, async (page, consoleErrors) => {
    const greeting = await openWidget(page);
    const turn = await askQuestion(page, question);
    await page.screenshot({
      path: path.join(runDir, "screenshots", `individual-${String(index).padStart(2, "0")}.png`),
    });
    return { mode: "individual", baseUrl, greeting, turn, consoleErrors };
  });
}

async function main() {
  const baseUrl = process.env.LUCY_REPRODUCTION_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "LUCY_REPRODUCTION_BASE_URL is required (e.g. http://127.0.0.1:3000 or a Vercel preview URL). " +
        "This harness never assumes a hostname and never embeds a credential.",
    );
  }
  const mode = process.argv[2] ?? "both";
  if (!["sequence", "individual", "both"].includes(mode)) {
    throw new Error(`Unknown mode "${mode}". Use sequence, individual, or both.`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(".artifacts", "lucy-reproduction", timestamp);
  await mkdir(path.join(runDir, "screenshots"), { recursive: true });

  const manifest = { baseUrl, mode, startedAt: new Date().toISOString(), questions: QUESTIONS };
  const browser = await chromium.launch();
  try {
    if (mode === "sequence" || mode === "both") {
      const sequence = await runSequence(browser, baseUrl, runDir);
      await writeFile(path.join(runDir, "sequence.json"), JSON.stringify(sequence, null, 2));
    }
    if (mode === "individual" || mode === "both") {
      for (const [zeroBasedIndex, question] of QUESTIONS.entries()) {
        const result = await runIndividual(browser, baseUrl, runDir, zeroBasedIndex + 1, question);
        await writeFile(
          path.join(runDir, `individual-${String(zeroBasedIndex + 1).padStart(2, "0")}.json`),
          JSON.stringify(result, null, 2),
        );
      }
    }
  } finally {
    await browser.close();
  }

  manifest.finishedAt = new Date().toISOString();
  await writeFile(path.join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  process.stdout.write(`Reproduction evidence written to ${runDir}\n`);
}

// Exported for the offline/mocked smoke check in docs/lucy-reproduction-harness.md; running
// this file directly (the normal case) still executes main() below exactly once.
export { openWidget, askQuestion, QUESTIONS };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
