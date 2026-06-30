export interface CodeValueFormValues {
  id: number | null;
  code: string;
  value: string;
  description: string;
  memo: string;
}

export interface CodeValueSearchParams {
  query: string;
}

export const EMPTY_CODE_VALUE_FORM: CodeValueFormValues = {
  id: null,
  code: '',
  value: '',
  description: '',
  memo: '',
};

export const EMPTY_SEARCH: CodeValueSearchParams = {
  query: '',
};
