import type { PrismaClient } from '@prisma/client';

export interface ExperimentInput {
  name: string;
  date?: string;
  version?: string;
  description?: string;
  status?: string;
}

export interface InputRow {
  id?: number;
  fieldKey: string;
  fieldValue: string;
}

export interface OutputRow {
  id?: number;
  source: string;
  fieldKey: string;
  fieldValue: string;
  memo?: string | null;
}

export class ExperimentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.experiment.findMany({
      orderBy: { date: 'desc' },
      include: { inputs: true, outputs: true },
    });
  }

  async findById(id: number) {
    return this.prisma.experiment.findUnique({
      where: { id },
      include: {
        inputs: true,
        outputs: true,
        comparisons: true,
        screenshots: true,
        verifications: true,
        hypotheses: true,
      },
    });
  }

  async create(data: ExperimentInput) {
    return this.prisma.experiment.create({
      data: {
        name: data.name,
        date: data.date ? new Date(data.date) : new Date(),
        version: data.version ?? '1.0.0',
        description: data.description ?? '',
        status: data.status ?? 'Draft',
      },
    });
  }

  async update(id: number, data: ExperimentInput) {
    return this.prisma.experiment.update({
      where: { id },
      data: {
        name: data.name,
        date: data.date ? new Date(data.date) : undefined,
        version: data.version,
        description: data.description,
        status: data.status,
      },
    });
  }

  async delete(id: number) {
    await this.prisma.experiment.delete({ where: { id } });
  }

  async saveInputs(experimentId: number, rows: InputRow[]) {
    await this.prisma.experimentInput.deleteMany({ where: { experimentId } });
    if (rows.length === 0) return [];
    await this.prisma.experimentInput.createMany({
      data: rows.map((r) => ({
        experimentId,
        fieldKey: r.fieldKey,
        fieldValue: r.fieldValue,
      })),
    });
    return this.prisma.experimentInput.findMany({ where: { experimentId } });
  }

  async saveOutputs(experimentId: number, rows: OutputRow[]) {
    await this.prisma.experimentOutput.deleteMany({ where: { experimentId } });
    if (rows.length === 0) return [];
    await this.prisma.experimentOutput.createMany({
      data: rows.map((r) => ({
        experimentId,
        source: r.source,
        fieldKey: r.fieldKey,
        fieldValue: r.fieldValue,
        memo: r.memo ?? null,
      })),
    });
    return this.prisma.experimentOutput.findMany({ where: { experimentId } });
  }
}
