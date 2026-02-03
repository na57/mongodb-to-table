/**
 * MongoDB to 2D Table Mapping Skill - Core Mapper
 */

import {
  MongoDBDocument, MappingConfig, TableData, TableColumn,
  MongoDBMappingType, MappingOptions, ExportOptions
} from './types';
import {
  MappingError, ValidationError, ConfigurationError, ErrorCollector,
  validateMappingConfig, validateInputData
} from './errors';
import { transformObject, flattenObject, getNestedValue, inferColumnType } from './transformers';
import { Exporter, CSVExporter, JSONExporter, ArrayExporter } from './exporters';

export class MongoDBToTableMapper {
  private config: MappingConfig;
  private errorCollector: ErrorCollector;

  constructor(config: MappingConfig) {
    validateMappingConfig(config);
    this.config = config;
    this.errorCollector = new ErrorCollector();
  }

  public map(documents: MongoDBDocument[]): TableData {
    validateInputData(documents);
    this.errorCollector.clear();

    if (this.config.mongoMappingType === 'array_expand') {
      return this.mapWithArrayExpand(documents);
    }
    return this.mapWithFlatten(documents);
  }

  private mapWithFlatten(documents: MongoDBDocument[]): TableData {
    const rows: Record<string, any>[] = [];
    const options = this.config.options || {};

    for (const doc of documents) {
      try {
        const flattened = this.flattenDocument(doc, options);
        const mappedRow = this.applyFieldMappings(flattened);
        rows.push(mappedRow);
      } catch (error) {
        this.handleMappingError(error, doc._id);
        if (!options.skipInvalidRows) throw error;
      }
    }

    return this.createTableData(rows, 'flatten');
  }

  private mapWithArrayExpand(documents: MongoDBDocument[]): TableData {
    const rows: Record<string, any>[] = [];
    const options = this.config.options || {};
    const arrayField = this.config.mongoArrayField!;
    const normalizedArrayField = arrayField.endsWith('[]') ? arrayField.slice(0, -2) : arrayField;

    for (const doc of documents) {
      try {
        const arrayValue = getNestedValue(doc, normalizedArrayField);
        
        if (!arrayValue || !Array.isArray(arrayValue)) {
          if (options.skipInvalidRows) continue;
          throw new ValidationError(`Document does not contain array field: ${arrayField}`, arrayField, doc);
        }

        for (const arrayElement of arrayValue) {
          const expandedDoc = this.createExpandedDocument(doc, normalizedArrayField, arrayElement);
          const flattened = this.flattenDocument(expandedDoc, options);
          const mappedRow = this.applyFieldMappings(flattened);
          rows.push(mappedRow);
        }
      } catch (error) {
        this.handleMappingError(error, doc._id);
        if (!options.skipInvalidRows) throw error;
      }
    }

    return this.createTableData(rows, 'array_expand');
  }

  private flattenDocument(doc: MongoDBDocument, options: MappingOptions): Record<string, any> {
    const maxDepth = options.maxDepth || 10;
    const flattened = flattenObject(doc, '', maxDepth);
    const excludeFields = options.excludeFields || [];
    const preserveBuffer = options.preserveBufferFields ?? false;

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(flattened)) {
      if (excludeFields.includes(key)) continue;
      if (!preserveBuffer && (key.endsWith('.buffer') || /\.buffer\.\d+$/.test(key))) continue;
      result[key] = value;
    }
    return result;
  }

  private createExpandedDocument(originalDoc: MongoDBDocument, arrayField: string, arrayElement: any): Record<string, any> {
    const expanded: Record<string, any> = {};
    for (const [key, value] of Object.entries(originalDoc)) {
      if (key === arrayField) {
        if (typeof arrayElement === 'object' && arrayElement !== null) {
          for (const [nestedKey, nestedValue] of Object.entries(arrayElement)) {
            expanded[`${arrayField}[].${nestedKey}`] = nestedValue;
          }
        } else {
          expanded[`${arrayField}[]`] = arrayElement;
        }
      } else {
        expanded[key] = value;
      }
    }
    return expanded;
  }

  private applyFieldMappings(flattenedDoc: Record<string, any>): Record<string, any> {
    if (this.config.options?.includeAllFields) return flattenedDoc;
    return transformObject(flattenedDoc, this.config.fieldMappings, {
      nullValue: this.config.options?.nullValue,
      dateFormat: this.config.options?.dateFormat
    });
  }

  private createTableData(rows: Record<string, any>[], mappingType: MongoDBMappingType): TableData {
    if (rows.length === 0) {
      return { columns: [], rows: [], metadata: { totalRows: 0, totalColumns: 0, mappingType, sourceCollection: '', generatedAt: new Date().toISOString() } };
    }

    const columns: TableColumn[] = this.inferColumns(rows);
    return {
      columns,
      rows,
      metadata: {
        totalRows: rows.length,
        totalColumns: columns.length,
        mappingType,
        sourceCollection: this.config.sourceTableName || 'unknown',
        generatedAt: new Date().toISOString()
      }
    };
  }

  private inferColumns(rows: Record<string, any>[]): TableColumn[] {
    const columnNames = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) columnNames.add(key);
    }

    const columns: TableColumn[] = [];
    for (const name of columnNames) {
      const values = rows.map(row => row[name]);
      const type = inferColumnType(values);
      const required = values.every(v => v !== null && v !== undefined);
      columns.push({ name, type, required });
    }

    return columns.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  private handleMappingError(error: unknown, documentId?: any): void {
    if (error instanceof MappingError) {
      this.errorCollector.add(error);
    } else {
      this.errorCollector.add(new MappingError((error as Error).message, 'UNKNOWN_ERROR', { documentId: String(documentId) }));
    }
  }

  public hasErrors(): boolean { return this.errorCollector.hasErrors(); }
  public getErrors(): MappingError[] { return this.errorCollector.getErrors(); }

  public export(data: TableData, options: ExportOptions): string {
    let exporter: Exporter;
    switch (options.format) {
      case 'csv': exporter = new CSVExporter(options); break;
      case 'json': exporter = new JSONExporter(options); break;
      case 'array': exporter = new ArrayExporter(options); break;
      default: throw new ConfigurationError(`Unknown export format: ${options.format}`);
    }
    return exporter.export(data);
  }
}

export function createMapper(config: MappingConfig): MongoDBToTableMapper {
  return new MongoDBToTableMapper(config);
}

export function mapMongoDBToTable(documents: MongoDBDocument[], config: MappingConfig): TableData {
  return createMapper(config).map(documents);
}
