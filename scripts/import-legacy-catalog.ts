#!/usr/bin/env node
/**
 * Import legacy Verification catalog JSON/CSV into prisma/dev.db and run the test suite.
 *
 * Usage:
 *   npm run catalog:import -- path/to/legacy-cases.json
 *   npm run catalog:import -- path/to/legacy-cases.csv --skip
 *   npm run catalog:import -- --suite-only
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  applyVerificationImportPlan,
  parseVerificationImportFile,
  planVerificationImport,
  type DuplicatePolicy,
} from '@/shared/utils/verificationImport';
import { runFullVerificationSuite } from '@/shared/utils/verificationSuite';
import type { Code, Experiment, Verification } from '@/types/electron';

const DEV_DB = path.join(process.cwd(), 'prisma', 'dev.db');
const REPORT_PATH = path.join(process.cwd(), 'imports', 'last-suite-report.json');

function printUsage(): void {
  console.log(`Usage:
  npm run catalog:import -- <file.json|file.csv> [--skip|--update] [--suite-only]

Options:
  --skip        Skip duplicate catalogId/name (default: --update)
  --update      Overwrite existing rows with same catalogId/name (default)
  --suite-only  Run suite on current DB without importing a file
  --report=PATH Write JSON report (default: imports/last-suite-report.json)
`);
}

function mapVerification(row: {
  id: number;
  experimentId: number | null;
  hypothesisId: number | null;
  name: string;
  inputData: string;
  expectedResult: string;
  actualResult: string | null;
  passed: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}): Verification {
  return {
    id: row.id,
    experimentId: row.experimentId,
    hypothesisId: row.hypothesisId,
    name: row.name,
    inputData: row.inputData,
    expectedResult: row.expectedResult,
    actualResult: row.actualResult,
    passed: row.passed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapExperiment(row: {
  id: number;
  name: string;
  date: Date;
  version: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  inputs: Array<{ id: number; experimentId: number; fieldKey: string; fieldValue: string }>;
  outputs: Array<{
    id: number;
    experimentId: number;
    source: string;
    fieldKey: string;
    fieldValue: string;
    memo: string | null;
  }>;
}): Experiment {
  return {
    id: row.id,
    name: row.name,
    date: row.date.toISOString(),
    version: row.version,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    inputs: row.inputs.map((input) => ({
      id: input.id,
      experimentId: input.experimentId,
      fieldKey: input.fieldKey,
      fieldValue: input.fieldValue,
    })),
    outputs: row.outputs.map((output) => ({
      id: output.id,
      experimentId: output.experimentId,
      source: output.source,
      fieldKey: output.fieldKey,
      fieldValue: output.fieldValue,
      memo: output.memo,
    })),
  };
}

function mapCode(row: {
  id: number;
  code: string;
  type: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}): Code {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return 0;
  }

  const suiteOnly = args.includes('--suite-only');
  const policy: DuplicatePolicy = args.includes('--skip') ? 'skip' : 'update';
  const reportArg = args.find((arg) => arg.startsWith('--report='));
  const reportPath = reportArg ? reportArg.slice('--report='.length) : REPORT_PATH;
  const filePath = args.find((arg) => !arg.startsWith('--'));

  if (!filePath && !suiteOnly) {
    printUsage();
    console.error('\nError: provide a .json/.csv file or use --suite-only');
    return 1;
  }

  if (!fs.existsSync(DEV_DB)) {
    console.error(`Error: database not found at ${DEV_DB}`);
    console.error('Run the app once or `npm run db:push` to create prisma/dev.db');
    return 1;
  }

  process.env.DATABASE_URL = `file:${DEV_DB.replace(/\\/g, '/')}`;
  const prisma = new PrismaClient();

  try {
    if (filePath) {
      const resolved = path.resolve(filePath);
      if (!fs.existsSync(resolved)) {
        console.error(`Error: file not found: ${resolved}`);
        return 1;
      }

      const content = fs.readFileSync(resolved, 'utf8');
      const incoming = parseVerificationImportFile(content, resolved);
      console.log(`Parsed ${incoming.length} case(s) from ${resolved}`);

      const existingRows = await prisma.verification.findMany();
      const existing = existingRows.map(mapVerification);
      const plan = planVerificationImport(existing, incoming, policy);

      if (plan.errors.length > 0) {
        console.error('Import plan errors:');
        for (const error of plan.errors) console.error(`  - ${error}`);
        return 1;
      }

      const importResult = await applyVerificationImportPlan(plan, async (input) => {
        const data = {
          experimentId: input.experimentId ?? null,
          hypothesisId: null,
          name: input.name,
          inputData: input.inputData ?? '{}',
          expectedResult: input.expectedResult,
          actualResult: input.actualResult ?? null,
          passed: null,
        };

        if (input.id) {
          await prisma.verification.update({ where: { id: input.id }, data });
          return;
        }
        await prisma.verification.create({ data });
      });

      console.log(
        `Import complete — created: ${importResult.created}, updated: ${importResult.updated}, skipped: ${importResult.skipped}`,
      );
    }

    const [verificationRows, experimentRows, codeRows] = await Promise.all([
      prisma.verification.findMany({ orderBy: { id: 'asc' } }),
      prisma.experiment.findMany({
        include: { inputs: true, outputs: true },
        orderBy: { id: 'asc' },
      }),
      prisma.code.findMany({ orderBy: { id: 'asc' } }),
    ]);

    const verifications = verificationRows.map(mapVerification);
    const experiments = experimentRows.map(mapExperiment);
    const codes = codeRows.map(mapCode);

    console.log(
      `\nRunning suite — verifications: ${verifications.length}, experiments: ${experiments.length}, codes: ${codes.length}`,
    );

    const summary = runFullVerificationSuite(verifications, experiments, codes);
    console.log(
      `\nSuite result: ${summary.passed}/${summary.total} passed (${summary.passRate}%)`,
    );

    const failures = summary.results.filter((row) => !row.passed);
    if (failures.length > 0) {
      console.log('\nFailures:');
      for (const failure of failures.slice(0, 30)) {
        const expectedPreview = failure.expected.replace(/\s+/g, ' ').slice(0, 100);
        const actualPreview = failure.actual.replace(/\s+/g, ' ').slice(0, 100);
        console.log(
          `  - [${failure.source}] ${failure.name} (${failure.field})\n    expected: ${expectedPreview}\n    actual:   ${actualPreview}`,
        );
      }
      if (failures.length > 30) {
        console.log(`  ... and ${failures.length - 30} more (see report JSON)`);
      }
    }

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    console.log(`\nReport written: ${reportPath}`);

    return summary.total > 0 && summary.passRate >= 95 ? 0 : failures.length > 0 ? 2 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
