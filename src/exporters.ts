/**
 * MongoDB to 2D Table Mapping Skill - Exporters
 */

import { TableData, ExportOptions } from './types';
import { ConfigurationError } from './errors';

export interface Exporter {
  export(data: TableData): string;
  exportToFile(data: TableData, filePath: string): void;
}

abstract class BaseExporter implements Exporter {
  protected options: ExportOptions;
  constructor(options: ExportOptions) { this.options = options; }
  abstract export(data: TableData): string;
  exportToFile(data: TableData, filePath: string): void {
    const content = this.export(data);
    require('fs').writeFileSync(filePath, content, this.options.encoding || 'utf-8');
  }
  protected formatValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}

export class CSVExporter extends BaseExporter {
  private separator = ',';
  private quoteCharacter = '"';

  export(data: TableData): string {
    if (data.rows.length === 0) return '';
    const lines: string[] = [];
    if (this.options.headers !== false) {
      lines.push(data.columns.map(col => this.quoteCharacter + col.name + this.quoteCharacter).join(this.separator));
    }
    for (const row of data.rows) {
      const values = data.columns.map(col => this.formatCSVValue(row[col.name]));
      lines.push(values.join(this.separator));
    }
    return lines.join('\n');
  }

  private formatCSVValue(value: any): string {
    const formatted = this.formatValue(value);
    const needsQuoting = formatted.includes(this.separator) || formatted.includes(this.quoteCharacter) || formatted.includes('\n');
    if (needsQuoting) {
      return this.quoteCharacter + formatted.replace(new RegExp(this.quoteCharacter, 'g'), this.quoteCharacter + this.quoteCharacter) + this.quoteCharacter;
    }
    return formatted;
  }
}

export class JSONExporter extends BaseExporter {
  export(data: TableData): string {
    if (this.options.headers === false) {
      return JSON.stringify(data.rows, null, 2);
    }
    return JSON.stringify({ metadata: data.metadata, columns: data.columns, data: data.rows }, null, 2);
  }
}

export class ArrayExporter extends BaseExporter {
  export(data: TableData): string {
    if (data.rows.length === 0) return JSON.stringify([]);
    if (this.options.headers === false) {
      return JSON.stringify(data.rows.map(row => Object.values(row)), null, 2);
    }
    const columnNames = data.columns.map(col => col.name);
    const rows = data.rows.map(row => Object.values(row));
    return JSON.stringify([columnNames, ...rows], null, 2);
  }
}

export function createExporter(options: ExportOptions): Exporter {
  switch (options.format) {
    case 'csv': return new CSVExporter(options);
    case 'json': return new JSONExporter(options);
    case 'array': return new ArrayExporter(options);
    default: throw new ConfigurationError(`Unknown export format: ${options.format}`);
  }
}

export function exportToCSV(data: TableData, options?: Partial<ExportOptions>): string {
  return createExporter({ format: 'csv', headers: true, encoding: 'utf-8', ...options }).export(data);
}

export function exportToJSON(data: TableData, options?: Partial<ExportOptions>): string {
  return createExporter({ format: 'json', headers: true, encoding: 'utf-8', ...options }).export(data);
}

export function exportToArray(data: TableData, options?: Partial<ExportOptions>): string {
  return createExporter({ format: 'array', headers: true, encoding: 'utf-8', ...options }).export(data);
}
