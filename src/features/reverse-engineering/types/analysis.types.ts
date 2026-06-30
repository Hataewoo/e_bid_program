export interface DigitFrequency {
  '0': number;
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
  '6': number;
  '7': number;
  '8': number;
  '9': number;
}

export interface Step1Result {
  length: number;
  frequency: DigitFrequency;
  evenCount: number;
  oddCount: number;
  lowCount: number;
  highCount: number;
  evenRatio: number;
  oddRatio: number;
  lowRatio: number;
  highRatio: number;
  duplicateCount: number;
  consecutiveCount: number;
}

export interface RLEEntry {
  digit: number;
  count: number;
}

export interface FullAnalysisResult {
  masterNo: string;
  input: string;
  step1: Step1Result;
  step2: { lowPart: string };
  step3: { highPart: string };
  step4: { groups: string[] };
  step5: { rle: RLEEntry[]; rleCounts: number[] };
  step6: {
    length: number;
    frequency: DigitFrequency;
    lowPart: string;
    highPart: string;
    groups: string[];
    rle: RLEEntry[];
    evenCount: number;
    oddCount: number;
    lowCount: number;
    highCount: number;
    duplicateCount: number;
    consecutiveCount: number;
  };
}

export interface MasterListItem {
  index: number;
  masterNo: string;
  hasData: boolean;
  valueLength: number;
}
