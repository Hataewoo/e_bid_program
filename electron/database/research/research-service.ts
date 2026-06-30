import type { PrismaClient } from '@prisma/client';
import { AppErrorCode } from '../../../src/shared/errors/app-error-codes';
import { ExperimentRepository } from './experiment/experiment-repository';
import { ExperimentService } from './experiment/experiment-service';
import { HypothesisRepository, HypothesisService } from './hypothesis/hypothesis-repository';
import { ComparisonRepository } from './comparison/comparison-repository';
import { comparisonService } from './comparison/comparison-service';
import { VerificationRepository, VerificationService } from './verification/verification-service';
import { ScreenshotRepository, ScreenshotService } from './screenshot/screenshot-service';

function outputsToMap(
  outputs: Array<{ source: string; fieldKey: string; fieldValue: string }>,
  source: string,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const o of outputs.filter((x) => x.source === source)) {
    map[o.fieldKey] = o.fieldValue;
  }
  return map;
}

export class ResearchService {
  readonly experiments: ExperimentService;
  readonly hypotheses: HypothesisService;
  readonly verifications: VerificationService;
  readonly screenshots: ScreenshotService;
  private comparisonRepository: ComparisonRepository;

  constructor(prisma: PrismaClient) {
    this.comparisonRepository = new ComparisonRepository(prisma);
    this.experiments = new ExperimentService(new ExperimentRepository(prisma));
    this.hypotheses = new HypothesisService(new HypothesisRepository(prisma));
    this.verifications = new VerificationService(new VerificationRepository(prisma));
    this.screenshots = new ScreenshotService(new ScreenshotRepository(prisma));
  }

  async compareExperiment(experimentId: number) {
    const experiment = await this.experiments.getById(experimentId);
    if (!experiment)
      return { success: false as const, errors: [AppErrorCode.VAL_EXPERIMENT_NOT_FOUND] };

    const legacy = outputsToMap(experiment.outputs, 'legacy');
    const ours = outputsToMap(experiment.outputs, 'ours');
    const keys = [...new Set([...Object.keys(legacy), ...Object.keys(ours)])];

    const diffs = comparisonService.compareOutputMaps(legacy, ours, keys);
    const comparisons = await this.comparisonRepository.createMany(experimentId, diffs);
    const allMatch = diffs.every((d) => d.isMatch);
    const status = allMatch ? 'Verified' : 'Failed';

    await this.experiments.save({
      id: experimentId,
      name: experiment.name,
      date: experiment.date.toISOString(),
      version: experiment.version,
      description: experiment.description,
      status,
    });

    return { success: true as const, data: { comparisons, allMatch, diffs } };
  }

  async exportAll(format: 'json' | 'csv' | 'txt' = 'json') {
    const [experiments, hypotheses, verifications] = await Promise.all([
      this.experiments.getAll(),
      this.hypotheses.getAll(),
      this.verifications.getAll(),
    ]);

    const fullExperiments = await Promise.all(
      experiments.map((e) => this.experiments.getById(e.id)),
    );

    const payload = {
      exportedAt: new Date().toISOString(),
      experiments: fullExperiments,
      hypotheses,
      verifications,
    };

    if (format === 'json') {
      return { format, content: JSON.stringify(payload, null, 2) };
    }

    if (format === 'txt') {
      const lines = [
        'CS E-Bid Research Export',
        `Exported: ${payload.exportedAt}`,
        `Experiments: ${fullExperiments.length}`,
        `Hypotheses: ${hypotheses.length}`,
        `Verifications: ${verifications.length}`,
        '',
        JSON.stringify(payload, null, 2),
      ];
      return { format, content: lines.join('\n') };
    }

    const rows = [['type', 'id', 'name', 'status', 'detail']];
    for (const e of fullExperiments) {
      if (!e) continue;
      rows.push(['experiment', String(e.id), e.name, e.status, e.description]);
    }
    for (const h of hypotheses) {
      rows.push([
        'hypothesis',
        String(h.id),
        h.title,
        h.verified ? 'verified' : 'open',
        h.description,
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    return { format, content: csv };
  }
}
