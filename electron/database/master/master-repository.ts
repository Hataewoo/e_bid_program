import type { PrismaClient } from '@prisma/client';
import type { MasterInput } from '../validation/validation-service';

export interface MasterRecord {
  id: number;
  masterNo: string;
  masterValue: string;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class MasterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<MasterRecord[]> {
    return this.prisma.master.findMany({ orderBy: { masterNo: 'asc' } });
  }

  async findByMasterNo(masterNo: string): Promise<MasterRecord | null> {
    return this.prisma.master.findUnique({ where: { masterNo } });
  }

  async create(data: MasterInput): Promise<MasterRecord> {
    return this.prisma.master.create({
      data: {
        masterNo: data.masterNo,
        masterValue: data.masterValue,
        memo: data.memo ?? null,
      },
    });
  }

  async update(data: MasterInput & { id: number }): Promise<MasterRecord> {
    return this.prisma.master.update({
      where: { id: data.id },
      data: {
        masterNo: data.masterNo,
        masterValue: data.masterValue,
        memo: data.memo ?? null,
      },
    });
  }

  async deleteByMasterNo(masterNo: string): Promise<void> {
    await this.prisma.master.delete({ where: { masterNo } });
  }

  async existsByMasterNo(masterNo: string, excludeId?: number): Promise<boolean> {
    const record = await this.prisma.master.findUnique({ where: { masterNo } });
    if (!record) return false;
    if (excludeId !== undefined && record.id === excludeId) return false;
    return true;
  }

  async count(): Promise<number> {
    return this.prisma.master.count();
  }

  async upsertByMasterNo(data: MasterInput): Promise<MasterRecord> {
    return this.prisma.master.upsert({
      where: { masterNo: data.masterNo },
      create: {
        masterNo: data.masterNo,
        masterValue: data.masterValue,
        memo: data.memo ?? null,
      },
      update: {
        masterValue: data.masterValue,
        memo: data.memo ?? null,
      },
    });
  }
}
