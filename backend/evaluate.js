#!/usr/bin/env node
/**
 * evaluate.js — Batch entry point (Section 9)
 *
 * Usage:
 *   npm run evaluate -- --input cases.json --output kits.json
 *
 * Input format (Appendix B):
 *   [{ "id": "case-01", "jd": "...", "company_url": "http://...", "days": 5 }]
 *
 * Output format (Appendix B):
 *   {
 *     "version": "1.0",
 *     "generated_at": "...",
 *     "kits": [{ "id", "status", "kit", "error" }]
 *   }
 *
 * - Continues after a case fails, records the failure
 * - Reads credentials from environment variables (see .env.example)
 * - Does NOT require a running server or database connection
 *   (pipeline runs in-process, results written directly to output file)
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPipeline } = require('./src/services/pipeline');

// Parse CLI args
const args = process.argv.slice(2);
const inputFlag = args.indexOf('--input');
const outputFlag = args.indexOf('--output');

if (inputFlag === -1 || outputFlag === -1) {
  console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
  process.exit(1);
}

const inputPath = path.resolve(args[inputFlag + 1]);
const outputPath = path.resolve(args[outputFlag + 1]);

async function main() {
  // Read input
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  let cases;
  try {
    cases = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    if (!Array.isArray(cases)) throw new Error('Input must be a JSON array');
  } catch (err) {
    console.error(`Failed to parse input file: ${err.message}`);
    process.exit(1);
  }

  console.log(`[BATCH] Processing ${cases.length} case(s)…`);

  const results = [];

  for (const c of cases) {
    const { id, jd, company_url, days } = c;
    console.log(`\n[BATCH] Case: ${id} — ${company_url}`);

    try {
      if (!jd || !company_url) {
        throw Object.assign(new Error('Missing required fields: jd and company_url'), {
          code: 'INVALID_INPUT',
        });
      }

      const kit = await runPipeline(
        { jd, companyUrl: company_url, days: days || 5 },
        (step, msg, pct) => console.log(`  [${step}] ${msg} (${pct}%)`)
      );

      // Strip internal _meta field before output
      const { _meta, ...kitOutput } = kit;

      results.push({
        id,
        status: 'ok',
        kit: kitOutput,
        error: null,
      });

      console.log(`  ✓ Done`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
      results.push({
        id,
        status: 'failed',
        kit: null,
        error: {
          code: err.code || 'PIPELINE_ERROR',
          message: err.message,
        },
      });
    }
  }

  // Write output
  const output = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n[BATCH] Done. Results written to: ${outputPath}`);
  console.log(`  ok: ${results.filter((r) => r.status === 'ok').length}`);
  console.log(`  failed: ${results.filter((r) => r.status === 'failed').length}`);
}

main().catch((err) => {
  console.error('[BATCH] Fatal error:', err.message);
  process.exit(1);
});
