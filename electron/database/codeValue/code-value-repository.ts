import type { PrismaClient } from '@prisma/client';
import type { CodeValueInput } from './code-value-validation-service';

export interface CodeValueRecord {
  id: number;
  code: string;
  value: string;
  description: string | null;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CodeValueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<CodeValueRecord[]> {
    return this.prisma.codeValue.findMany({ orderBy: { id: 'asc' } });
  }

  async findById(id: number): Promise<CodeValueRecord | null> {
    return this.prisma.codeValue.findUnique({ where: { id } });
  }

  async create(data: CodeValueInput): Promise<CodeValueRecord> {
    return this.prisma.codeValue.create({
      data: {
        code: data.code,
        value: data.value,
        description: data.description ?? null,
        memo: data.memo ?? null,
      },
    });
  }

  async update(data: CodeValueInput & { id: number }): Promise<CodeValueRecord> {
    return this.prisma.codeValue.update({
      where: { id: data.id },
      data: {
        code: data.code,
        value: data.value,
        description: data.description ?? null,
        memo: data.memo ?? null,
      },
    });
  }

  async deleteById(id: number): Promise<void> {
    await this.prisma.codeValue.delete({ where: { id } });
  }

  async count(): Promise<number> {
    return this.prisma.codeValue.count();
  }
}
