import type { Code, Experiment, Verification } from '../../src/types/electron';

export function mapCodeRow(row: {
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

export function mapVerificationRow(row: {
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

export function mapExperimentRow(row: {
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
