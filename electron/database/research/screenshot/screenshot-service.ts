import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { PrismaClient } from '@prisma/client';

export class ScreenshotRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByExperiment(experimentId: number) {
    return this.prisma.screenshot.findMany({
      where: { experimentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    experimentId: number;
    filename: string;
    filePath: string;
    caption?: string | null;
  }) {
    return this.prisma.screenshot.create({ data });
  }

  async delete(id: number) {
    const record = await this.prisma.screenshot.findUnique({ where: { id } });
    if (record && fs.existsSync(record.filePath)) {
      fs.unlinkSync(record.filePath);
    }
    await this.prisma.screenshot.delete({ where: { id } });
  }
}

export class ScreenshotService {
  private screenshotDir = '';

  constructor(private readonly repository: ScreenshotRepository) {
    this.screenshotDir = path.join(app.getPath('userData'), 'research', 'screenshots');
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async getByExperiment(experimentId: number) {
    return this.repository.findByExperiment(experimentId);
  }

  async save(experimentId: number, filename: string, dataBase64: string, caption?: string) {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(this.screenshotDir, `${Date.now()}_${safeName}`);
    fs.writeFileSync(filePath, Buffer.from(dataBase64, 'base64'));
    return this.repository.create({
      experimentId,
      filename: safeName,
      filePath,
      caption: caption ?? null,
    });
  }

  readAsBase64(filePath: string): string | null {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath).toString('base64');
  }

  async delete(id: number) {
    await this.repository.delete(id);
    return { success: true as const };
  }
}
