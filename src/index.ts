/**
 * MongoDB to 2D Table Mapping Skill - Main Entry Point
 */

export * from './types';
export * from './errors';
export * from './transformers';
export * from './mapper';
export * from './exporters';

import { MongoDBToTableMapper, createMapper, mapMongoDBToTable } from './mapper';
import { TableData, MappingConfig, MongoDBDocument, ExportOptions } from './types';
import { exportToCSV, exportToJSON, exportToArray } from './exporters';

export interface QuickMappingOptions {
  mongoMappingType?: 'flatten' | 'array_expand';
  mongoArrayField?: string;
  fieldMappings?: Array<{ databaseField: string; documentField: string; transform?: { type: string; format?: string } }>;
  includeAllFields?: boolean;
  excludeFields?: string[];
  nullValue?: string;
  skipInvalidRows?: boolean;
}

export function quickMap(documents: MongoDBDocument[], options?: QuickMappingOptions): TableData {
  const config: MappingConfig = {
    mongoMappingType: options?.mongoMappingType || 'flatten',
    mongoArrayField: options?.mongoArrayField,
    fieldMappings: options?.fieldMappings || [],
    options: {
      includeAllFields: options?.includeAllFields,
      excludeFields: options?.excludeFields,
      nullValue: options?.nullValue,
      skipInvalidRows: options?.skipInvalidRows
    }
  };
  return mapMongoDBToTable(documents, config);
}

export function quickExport(data: TableData, format: 'csv' | 'json' | 'array', options?: Partial<ExportOptions>): string {
  switch (format) {
    case 'csv': return exportToCSV(data, options);
    case 'json': return exportToJSON(data, options);
    case 'array': return exportToArray(data, options);
    default: throw new Error(`Unknown format: ${format}`);
  }
}

export { MongoDBToTableMapper, createMapper, mapMongoDBToTable, TableData, MappingConfig, MongoDBDocument, ExportOptions };
