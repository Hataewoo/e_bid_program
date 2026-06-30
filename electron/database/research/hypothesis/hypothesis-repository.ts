import type { PrismaClient } from '@prisma/client';

export interface HypothesisInput {
  experimentId?: number | null;
  sourceField?: string | null;
  title: string;
  description: string;
  confidence?: number;
  verified?: boolean;
}

export class HypothesisRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.hypothesis.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(data: HypothesisInput) {
    return this.prisma.hypothesis.create({
      data: {
        experimentId: data.experimentId ?? null,
        sourceField: data.sourceField?.trim() || null,
        title: data.title,
        description: data.description,
        confidence: data.confidence ?? 0,
        verified: data.verified ?? false,
      },
    });
  }

  async update(id: number, data: HypothesisInput) {
    return this.prisma.hypothesis.update({
      where: { id },
      data: {
        experimentId: data.experimentId ?? null,
        sourceField: data.sourceField?.trim() || null,
        title: data.title,
        description: data.description,
        confidence: data.confidence ?? 0,
        verified: data.verified ?? false,
      },
    });
  }

  async delete(id: number) {
    await this.prisma.hypothesis.delete({ where: { id } });
  }
}

export class HypothesisService {
  constructor(private readonly repository: HypothesisRepository) {}

  async getAll() {
    return this.repository.findAll();
  }

  async save(input: HypothesisInput & { id?: number | null }) {
    if (input.id) {
      return { success: true as const, data: await this.repository.update(input.id, input) };
    }
    return { success: true as const, data: await this.repository.create(input) };
  }

  async delete(id: number) {
    await this.repository.delete(id);
    return { success: true as const };
  }
}
