import type { PrismaClient } from '@prisma/client';

export interface VerificationInput {
  experimentId?: number | null;
  hypothesisId?: number | null;
  name: string;
  inputData?: string;
  expectedResult: string;
  actualResult?: string | null;
}

export class VerificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.verification.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: number) {
    return this.prisma.verification.findUnique({ where: { id } });
  }

  async create(data: VerificationInput & { passed?: boolean | null }) {
    return this.prisma.verification.create({
      data: {
        experimentId: data.experimentId ?? null,
        hypothesisId: data.hypothesisId ?? null,
        name: data.name,
        inputData: data.inputData ?? '{}',
        expectedResult: data.expectedResult,
        actualResult: data.actualResult ?? null,
        passed: data.passed ?? null,
      },
    });
  }

  async update(id: number, data: VerificationInput & { passed?: boolean | null }) {
    return this.prisma.verification.update({
      where: { id },
      data: {
        experimentId: data.experimentId ?? null,
        hypothesisId: data.hypothesisId ?? null,
        name: data.name,
        inputData: data.inputData ?? '{}',
        expectedResult: data.expectedResult,
        actualResult: data.actualResult ?? null,
        passed: data.passed ?? null,
      },
    });
  }

  async delete(id: number) {
    await this.prisma.verification.delete({ where: { id } });
  }
}

export class VerificationService {
  constructor(private readonly repository: VerificationRepository) {}

  evaluatePass(expected: string, actual: string): boolean {
    return expected.trim() === (actual ?? '').trim();
  }

  async getAll() {
    return this.repository.findAll();
  }

  async save(input: VerificationInput & { id?: number | null }) {
    let passed: boolean | null = null;
    if (input.actualResult !== undefined && input.actualResult !== null) {
      passed = this.evaluatePass(input.expectedResult, input.actualResult);
    }

    if (input.id) {
      return {
        success: true as const,
        data: await this.repository.update(input.id, { ...input, passed }),
        passed,
      };
    }
    return {
      success: true as const,
      data: await this.repository.create({ ...input, passed }),
      passed,
    };
  }

  async delete(id: number) {
    await this.repository.delete(id);
    return { success: true as const };
  }
}
