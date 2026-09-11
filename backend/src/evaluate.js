#!/usr/bin/env node
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { connectDB } = require('./config/db');
const { runPipeline } = require('./services/pipeline');

async function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const outputIdx = args.indexOf('--output');

  if (inputIdx === -1 || outputIdx === -1) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  const inputPath = path.resolve(args[inputIdx + 1]);
  const outputPath = path.resolve(args[outputIdx + 1]);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  let cases;
  try {
    cases = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse input JSON: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(cases)) {
    console.error('Input must be a JSON array of cases');
    process.exit(1);
  }

  // Connect to DB (optional in batch mode, but validates config)
  try {
    await connectDB();
  } catch (err) {
    console.warn('Warning: Could not connect to MongoDB (batch mode can run without it):', err.message);
  }

  console.log(`Processing ${cases.length} case(s)...`);

  const results = [];

  for (const c of cases) {
    const { id, jd, company_url, days } = c;
    console.log(`\n[${id}] Starting...`);

    try {
      if (!jd || !company_url) {
        throw new Error('Case missing required fields: jd, company_url');
      }

      const kit = await runPipeline(
        { jd, company_url, days: days || 5 },
        ({ step, message }) => console.log(`  [${id}] [${step}] ${message}`)
      );

      results.push({ id, status: 'ok', kit, error: null });
      console.log(`[${id}] Done ✓`);
    } catch (err) {
      console.error(`[${id}] Failed:`, err.message);
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

  const output = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nOutput written to ${outputPath}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
