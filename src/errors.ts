/**
 * MongoDB to 2D Table Mapping Skill - Error Handling
 */

export class MappingError extends Error {
  public readonly code: string;
  public readonly field?: string;
  public readonly documentId?: string;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    options?: {
      field?: string;
      documentId?: string;
      recoverable?: boolean;
    }
  ) {
    super(message);
    this.name = 'MappingError';
    this.code = code;
    this.field = options?.field;
    this.documentId = options?.documentId;
    this.recoverable = options?.recoverable ?? true;
  }
}

export class ValidationError extends MappingError {
  constructor(message: string, field?: string, value?: any) {
    super(`Validation failed: ${message}`, 'VALIDATION_ERROR', { field, recoverable: true });
    this.name = 'ValidationError';
  }
}

export class TransformationError extends MappingError {
  constructor(message: string, field: string, value: any, documentId?: string) {
    super(`Transformation failed for field "${field}": ${message}`, 'TRANSFORMATION_ERROR', { field, documentId, recoverable: true });
    this.name = 'TransformationError';
  }
}

export class ConfigurationError extends MappingError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 'CONFIGURATION_ERROR', { recoverable: false });
    this.name = 'ConfigurationError';
  }
}

export class ExportError extends MappingError {
  constructor(message: string, format: string) {
    super(`Export failed (${format}): ${message}`, 'EXPORT_ERROR', { recoverable: true });
    this.name = 'ExportError';
  }
}

export class ErrorCollector {
  private errors: MappingError[] = [];

  add(error: MappingError): void { this.errors.push(error); }
  hasErrors(): boolean { return this.errors.length > 0; }
  getErrors(): MappingError[] { return [...this.errors]; }
  clear(): void { this.errors = []; }
}

export function validateMappingConfig(config: any): void {
  if (!config) throw new ConfigurationError('Mapping configuration is required');
  if (!config.fieldMappings || !Array.isArray(config.fieldMappings)) {
    throw new ConfigurationError('fieldMappings must be an array');
  }
  if (config.mongoMappingType === 'array_expand' && !config.mongoArrayField) {
    throw new ConfigurationError('mongoArrayField is required when using array_expand');
  }
}

export function validateInputData(data: any[]): void {
  if (!Array.isArray(data)) throw new ValidationError('Input data must be an array');
  if (data.length === 0) throw new ValidationError('Input data array cannot be empty');
}
