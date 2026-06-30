import type { PrismaClient } from '@prisma/client';
import type { CodeInput } from './code-validation-service';

export interface CodeRecord {
  id: number;
  code: string;
  type: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CodeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<CodeRecord[]> {
    return this.prisma.code.findMany({ orderBy: { code: 'asc' } });
  }

  async findById(id: number): Promise<CodeRecord | null> {
    return this.prisma.code.findUnique({ where: { id } });
  }

  async findByCode(code: string): Promise<CodeRecord | null> {
    return this.prisma.code.findUnique({ where: { code } });
  }

  async create(data: CodeInput): Promise<CodeRecord> {
    return this.prisma.code.create({
      data: {
        code: data.code,
        type: data.type,
        description: data.description ?? '',
      },
    });
  }

  async update(data: CodeInput & { id: number }): Promise<CodeRecord> {
    return this.prisma.code.update({
      where: { id: data.id },
      data: {
        code: data.code,
        type: data.type,
        description: data.description ?? '',
      },
    });
  }

  async upsertByCode(data: CodeInput): Promise<CodeRecord> {
    const existing = await this.findByCode(data.code);
    if (existing) {
      return this.update({ id: existing.id, ...data });
    }
    return this.create(data);
  }

  async deleteById(id: number): Promise<void> {
    await this.prisma.code.delete({ where: { id } });
  }

  async existsByCode(code: string, excludeId?: number): Promise<boolean> {
    const record = await this.prisma.code.findUnique({ where: { code } });
    if (!record) return false;
    if (excludeId !== undefined && record.id === excludeId) return false;
    return true;
  }

  async count(): Promise<number> {
    return this.prisma.code.count();
  }
}
