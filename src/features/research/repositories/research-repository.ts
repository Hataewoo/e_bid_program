import { electronService } from '@/services';
import type {
  Experiment,
  ExperimentInputRow,
  ExperimentOutputRow,
  ExperimentSaveInput,
  Hypothesis,
  HypothesisSaveInput,
  Screenshot,
  Verification,
  VerificationSaveInput,
} from '@/types/electron';

export class ResearchRepository {
  async findAllExperiments(): Promise<Experiment[]> {
    return electronService.getExperiments();
  }

  async findExperimentById(id: number): Promise<Experiment | null> {
    return electronService.getExperimentById(id);
  }

  async saveExperiment(input: ExperimentSaveInput) {
    return electronService.saveExperiment(input);
  }

  async deleteExperiment(id: number) {
    return electronService.deleteExperiment(id);
  }

  async saveExperimentInputs(experimentId: number, rows: ExperimentInputRow[]) {
    return electronService.saveExperimentInputs(experimentId, rows);
  }

  async saveExperimentOutputs(experimentId: number, rows: ExperimentOutputRow[]) {
    return electronService.saveExperimentOutputs(experimentId, rows);
  }

  async compareExperiment(id: number) {
    return electronService.compareExperiment(id);
  }

  async findAllHypotheses(): Promise<Hypothesis[]> {
    return electronService.getHypotheses();
  }

  async saveHypothesis(input: HypothesisSaveInput) {
    return electronService.saveHypothesis(input);
  }

  async deleteHypothesis(id: number) {
    return electronService.deleteHypothesis(id);
  }

  async findAllVerifications(): Promise<Verification[]> {
    return electronService.getVerifications();
  }

  async saveVerification(input: VerificationSaveInput) {
    return electronService.saveVerification(input);
  }

  async deleteVerification(id: number) {
    return electronService.deleteVerification(id);
  }

  async findScreenshots(experimentId: number): Promise<Screenshot[]> {
    return electronService.getScreenshots(experimentId);
  }

  async saveScreenshot(
    experimentId: number,
    filename: string,
    dataBase64: string,
    caption?: string,
  ) {
    return electronService.saveScreenshot(experimentId, filename, dataBase64, caption);
  }

  async deleteScreenshot(id: number) {
    return electronService.deleteScreenshot(id);
  }

  async exportAll(format: 'json' | 'csv' | 'txt') {
    return electronService.exportAllResearch(format);
  }
}

export const researchRepository = new ResearchRepository();
