/**
 * MongoDB to 2D Table Mapping Skill - Type Definitions
 */

export type MongoDBMappingType = 'flatten' | 'array_expand';

export interface FieldMapping {
  databaseField: string;
  documentField: string;
  transform?: TransformRule;
  required?: boolean;
  defaultValue?: any;
}

export interface TransformRule {
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'custom';
  format?: string;
  customTransform?: (value: any) => any;
}

export interface MappingConfig {
  mongoMappingType: MongoDBMappingType;
  mongoArrayField?: string;
  fieldMappings: FieldMapping[];
  options?: MappingOptions;
}

export interface MappingOptions {
  includeAllFields?: boolean;
  excludeFields?: string[];
  maxDepth?: number;
  dateFormat?: string;
  nullValue?: string;
  arraySeparator?: string;
  skipInvalidRows?: boolean;
  preserveBufferFields?: boolean;
}

export interface TableColumn {
  name: string;
  type: string;
  required: boolean;
  sourceFields?: string[];
}

export interface TableData {
  columns: TableColumn[];
  rows: Record<string, any>[];
  metadata: {
    totalRows: number;
    totalColumns: number;
    mappingType: MongoDBMappingType;
    sourceCollection: string;
    generatedAt: string;
  };
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'array';
  filename?: string;
  encoding?: string;
  headers?: boolean;
  dateFormat?: string;
}

export interface ProcessingStats {
  totalDocuments: number;
  processedRows: number;
  skippedRows: number;
  errorCount: number;
  errors: ProcessingError[];
}

export interface ProcessingError {
  documentId: string;
  field?: string;
  message: string;
  timestamp: Date;
}

export interface MongoDBDocument {
  _id: any;
  [key: string]: any;
}

export interface ArrayFieldInfo {
  fieldName: string;
  elementType: 'object' | 'primitive';
  nestedFields?: string[];
}
