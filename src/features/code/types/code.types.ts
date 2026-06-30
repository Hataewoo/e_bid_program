export interface CodeRecord {
  id: number;
  code: string;
  type: string;
  description: string;
}

export interface CodeGridRow extends CodeRecord {
  index: number;
}

export interface CodeFormValues {
  id: number | null;
  /** 명칭 — 코드명 */
  code: string;
  /** 명칭 — 구분 (저점/고점 등) */
  type: string;
  description: string;
}

export interface CodeSearchParams {
  code: string;
  description: string;
}

export const EMPTY_CODE_FORM: CodeFormValues = {
  id: null,
  code: '',
  type: '',
  description: '',
};

export const EMPTY_SEARCH: CodeSearchParams = {
  code: '',
  description: '',
};

export const DEFAULT_CODE_TYPE = 'PATTERN';

export const CODE_WINDOW_VERSION = '1.1.34';
