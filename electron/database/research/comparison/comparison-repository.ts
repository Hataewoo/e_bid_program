import type { PrismaClient } from '@prisma/client';
import type { ComparisonDiff } from './comparison-service';

export class ComparisonRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async deleteByExperiment(experimentId: number) {
    await this.prisma.comparison.deleteMany({ where: { experimentId } });
  }

  async createMany(experimentId: number, diffs: ComparisonDiff[]) {
    await this.deleteByExperiment(experimentId);
    if (diffs.length === 0) return [];
    await this.prisma.comparison.createMany({
      data: diffs.map((d) => ({
        experimentId,
        fieldKey: d.fieldKey,
        legacyValue: d.legacyValue,
        oursValue: d.oursValue,
        diffType: d.diffType ?? null,
        diffDetail: d.diffDetail ?? null,
        isMatch: d.isMatch,
      })),
    });
    return this.prisma.comparison.findMany({
      where: { experimentId },
      orderBy: { fieldKey: 'asc' },
    });
  }

  async findByExperiment(experimentId: number) {
    return this.prisma.comparison.findMany({
      where: { experimentId },
      orderBy: { fieldKey: 'asc' },
    });
  }
}
