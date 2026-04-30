export type AMRColumnType = 'string' | 'link' | 'array-link' | 'labelled-link';

export type AMRColumnMeta = {
  id: string;
  label: string;
  type: AMRColumnType;
  sortable: boolean;
  url_template?: string;
};

export type AMRRecordValue = string | number | boolean | null | string[];
export type AMRRecord = Record<string, AMRRecordValue>;

export type AMRRecordsResponse = {
  meta: {
    page: number;
    per_page: number;
    total_hits: number;
    columns: AMRColumnMeta[];
  };
  data: AMRRecord[];
};
