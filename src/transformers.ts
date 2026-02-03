/**
 * MongoDB to 2D Table Mapping Skill - Data Type Transformers
 */

import { TransformRule } from './types';
import { TransformationError } from './errors';

export const builtInTransformers: Record<string, (value: any, rule?: TransformRule) => any> = {
  string: (value: any) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  },
  number: (value: any) => {
    if (value === null || value === undefined) return NaN;
    const num = Number(value);
    return isNaN(num) ? NaN : num;
  },
  boolean: (value: any) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return Boolean(value);
  },
  date: (value: any, rule?: TransformRule) => {
    if (value === null || value === undefined) return null;
    const format = rule?.format || 'ISO';
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    switch (format) {
      case 'ISO': return date.toISOString();
      case 'unix': return Math.floor(date.getTime() / 1000);
      case 'date': return date.toISOString().split('T')[0];
      case 'datetime': return date.toISOString().slice(0, 19).replace('T', ' ');
      default: return date.toISOString();
    }
  },
  array: (value: any, rule?: TransformRule) => {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value;
    const separator = rule?.format || ',';
    if (typeof value === 'string') {
      return value.split(separator).map((item: string) => item.trim());
    }
    return [value];
  },
  object: (value: any) => {
    if (value === null || value === undefined) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    return { value };
  }
};

export function transformValue(value: any, rule?: TransformRule, context?: { fieldPath?: string; documentId?: string }): any {
  if (value === null || value === undefined) return null;
  if (!rule) return value;

  if (rule.type === 'custom' && rule.customTransform) {
    return rule.customTransform(value);
  }

  const transformer = builtInTransformers[rule.type];
  if (!transformer) {
    throw new TransformationError(`Unknown transform type: ${rule.type}`, context?.fieldPath || 'unknown', value, context?.documentId);
  }

  return transformer(value, rule);
}

export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (current instanceof Map) {
      current = current.get(key);
    } else {
      current = current[key];
    }
  }

  return current;
}

export function flattenObject(obj: Record<string, any>, prefix: string = '', maxDepth: number = 10, currentDepth: number = 0): Record<string, any> {
  if (currentDepth > maxDepth) {
    return { [prefix]: obj };
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      result[newKey] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey, maxDepth, currentDepth + 1));
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        result[newKey] = [];
      } else {
        const firstItem = value[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          for (let i = 0; i < value.length; i++) {
            Object.assign(result, flattenObject(value[i], `${newKey}[${i}]`, maxDepth, currentDepth + 1));
          }
        } else {
          result[newKey] = value;
        }
      }
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

export function inferColumnType(values: any[]): string {
  const nonNullValues = values.filter(v => v !== null && v !== undefined);
  if (nonNullValues.length === 0) return 'unknown';
  const types = new Set(nonNullValues.map(v => typeof v));
  if (types.size === 1) {
    const type = nonNullValues[0];
    if (typeof type === 'number') return Number.isInteger(type) ? 'integer' : 'float';
    return Array.from(types)[0];
  }
  if (types.has('object') || types.has('array')) return 'string';
  return 'string';
}
