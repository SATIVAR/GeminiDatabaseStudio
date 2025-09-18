export type SourceField = {
  name: string;
  type: string;
  sample: any;
};

export type TargetField = {
  sourceField: string;
  targetField: string;
  include: boolean;
  dataType: 'string' | 'number' | 'boolean' | 'auto';
};

export type OutputFormat = 'JSON' | 'SQL' | 'XML';
