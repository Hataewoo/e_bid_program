import type {
  ExperimentRepository,
  ExperimentInput,
  InputRow,
  OutputRow,
} from './experiment-repository';

export class ExperimentService {
  constructor(private readonly repository: ExperimentRepository) {}

  async getAll() {
    return this.repository.findAll();
  }

  async getById(id: number) {
    return this.repository.findById(id);
  }

  async save(input: ExperimentInput & { id?: number | null }) {
    if (input.id) {
      return { success: true as const, data: await this.repository.update(input.id, input) };
    }
    return { success: true as const, data: await this.repository.create(input) };
  }

  async delete(id: number) {
    await this.repository.delete(id);
    return { success: true as const };
  }

  async saveInputs(experimentId: number, rows: InputRow[]) {
    const data = await this.repository.saveInputs(experimentId, rows);
    return { success: true as const, data };
  }

  async saveOutputs(experimentId: number, rows: OutputRow[]) {
    const data = await this.repository.saveOutputs(experimentId, rows);
    return { success: true as const, data };
  }
}
