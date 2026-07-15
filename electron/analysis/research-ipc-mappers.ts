import type {
  Code,
  Comparison,
  Experiment,
  Hypothesis,
  Screenshot,
  Verification,
} from '../../src/types/electron';

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

export function mapHypothesisRow(row: {
  id: number;
  experimentId: number | null;
  sourceField: string | null;
  title: string;
  description: string;
  confidence: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Hypothesis {
  return {
    id: row.id,
    experimentId: row.experimentId,
    sourceField: row.sourceField,
    title: row.title,
    description: row.description,
    confidence: row.confidence,
    verified: row.verified,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapComparisonRow(row: {
  id: number;
  experimentId: number;
  fieldKey: string;
  legacyValue: string;
  oursValue: string;
  diffType: string | null;
  diffDetail: string | null;
  isMatch: boolean;
  createdAt: Date;
}): Comparison {
  return {
    id: row.id,
    experimentId: row.experimentId,
    fieldKey: row.fieldKey,
    legacyValue: row.legacyValue,
    oursValue: row.oursValue,
    diffType: row.diffType,
    diffDetail: row.diffDetail,
    isMatch: row.isMatch,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapScreenshotRow(row: {
  id: number;
  experimentId: number;
  filename: string;
  filePath: string;
  caption: string | null;
  createdAt: Date;
}): Screenshot {
  return {
    id: row.id,
    experimentId: row.experimentId,
    filename: row.filename,
    filePath: row.filePath,
    caption: row.caption,
    createdAt: row.createdAt.toISOString(),
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
  inputs?: Array<{ id: number; experimentId: number; fieldKey: string; fieldValue: string }>;
  outputs?: Array<{
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
    inputs: (row.inputs ?? []).map((input) => ({
      id: input.id,
      experimentId: input.experimentId,
      fieldKey: input.fieldKey,
      fieldValue: input.fieldValue,
    })),
    outputs: (row.outputs ?? []).map((output) => ({
      id: output.id,
      experimentId: output.experimentId,
      source: output.source,
      fieldKey: output.fieldKey,
      fieldValue: output.fieldValue,
      memo: output.memo,
    })),
  };
}

export function mapExperimentDetailRow(row: {
  id: number;
  name: string;
  date: Date;
  version: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  inputs?: Array<{ id: number; experimentId: number; fieldKey: string; fieldValue: string }>;
  outputs?: Array<{
    id: number;
    experimentId: number;
    source: string;
    fieldKey: string;
    fieldValue: string;
    memo: string | null;
  }>;
  comparisons?: Array<{
    id: number;
    experimentId: number;
    fieldKey: string;
    legacyValue: string;
    oursValue: string;
    diffType: string | null;
    diffDetail: string | null;
    isMatch: boolean;
    createdAt: Date;
  }>;
  screenshots?: Array<{
    id: number;
    experimentId: number;
    filename: string;
    filePath: string;
    caption: string | null;
    createdAt: Date;
  }>;
  verifications?: Array<{
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
  }>;
  hypotheses?: Array<{
    id: number;
    experimentId: number | null;
    sourceField: string | null;
    title: string;
    description: string;
    confidence: number;
    verified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): Experiment {
  return {
    ...mapExperimentRow(row),
    comparisons: (row.comparisons ?? []).map(mapComparisonRow),
    screenshots: (row.screenshots ?? []).map(mapScreenshotRow),
    verifications: (row.verifications ?? []).map(mapVerificationRow),
    hypotheses: (row.hypotheses ?? []).map(mapHypothesisRow),
  };
}
