export interface FrequencyItem {
  digit: number;
  count: number;
  ratio: number;
}

export interface FrequencySummary {
  totalDigits: number;
  uniqueDigits: number;
}

export interface FrequencyData {
  items: FrequencyItem[];
  summary: FrequencySummary;
}

/** Hard-coded dummy — no runtime calculation */
export const EMPTY_FREQUENCY_DATA: FrequencyData = {
  items: [],
  summary: { totalDigits: 0, uniqueDigits: 0 },
};
