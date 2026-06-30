export type { Master, MasterInput, MasterSaveInput, DataValidationResult } from '@/types/electron';

export interface MasterGridRow {
  index: number;
  masterNo: string;
  memo: string;
  id: number | null;
  hasData: boolean;
}

export interface MasterFormValues {
  id: number | null;
  masterNo: string;
  masterValue: string;
  memo: string;
}

export const MASTER_NO_OPTIONS = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));

export const EMPTY_FORM: MasterFormValues = {
  id: null,
  masterNo: '00',
  masterValue: '',
  memo: '',
};
