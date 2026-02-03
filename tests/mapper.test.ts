/**
 * MongoDB to 2D Table Mapping Skill - Unit Tests
 */

import {
  MongoDBToTableMapper, createMapper, quickMap, quickExport,
  exportToCSV, exportToJSON, exportToArray
} from '../src';
import { MappingConfig, MongoDBDocument, TableData } from '../src/types';
import { ValidationError, ConfigurationError } from '../src/errors';

describe('MongoDBToTableMapper', () => {
  describe('Configuration Validation', () => {
    it('should throw ConfigurationError for null config', () => {
      expect(() => createMapper(null as any)).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for empty fieldMappings', () => {
      const config: MappingConfig = { mongoMappingType: 'flatten', fieldMappings: [] };
      expect(() => createMapper(config)).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for array_expand without mongoArrayField', () => {
      const config: MappingConfig = { mongoMappingType: 'array_expand', fieldMappings: [{ databaseField: 'test', documentField: 'test' }] };
      expect(() => createMapper(config)).toThrow(ConfigurationError);
    });
  });

  describe('Input Validation', () => {
    it('should throw ValidationError for non-array input', () => {
      const mapper = createMapper({ mongoMappingType: 'flatten', fieldMappings: [{ databaseField: '_id', documentField: 'id' }] });
      expect(() => mapper.map(null as any)).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty array input', () => {
      const mapper = createMapper({ mongoMappingType: 'flatten', fieldMappings: [{ databaseField: '_id', documentField: 'id' }] });
      expect(() => mapper.map([])).toThrow(ValidationError);
    });
  });

  describe('Flatten Mode Mapping', () => {
    it('should map simple fields correctly', () => {
      const documents: MongoDBDocument[] = [{ _id: 1, name: 'John', age: 30 }];
      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'name', documentField: 'user_name' },
          { databaseField: 'age', documentField: 'user_age' }
        ]
      });
      const result = mapper.map(documents);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual({ id: 1, user_name: 'John', user_age: 30 });
    });

    it('should flatten nested objects', () => {
      const documents: MongoDBDocument[] = [{ _id: 1, user: { profile: { name: 'John', email: 'john@example.com' } } }];
      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'user.profile.name', documentField: 'name' },
          { databaseField: 'user.profile.email', documentField: 'email' }
        ]
      });
      const result = mapper.map(documents);
      expect(result.rows[0]).toEqual({ id: 1, name: 'John', email: 'john@example.com' });
    });

    it('should convert arrays to JSON strings', () => {
      const documents: MongoDBDocument[] = [{ _id: 1, tags: ['admin', 'developer'] }];
      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [{ databaseField: 'tags', documentField: 'user_tags' }]
      });
      const result = mapper.map(documents);
      expect(result.rows[0].user_tags).toBe('["admin","developer"]');
    });
  });

  describe('Array Expand Mode Mapping', () => {
    it('should expand array elements to separate rows', () => {
      const documents: MongoDBDocument[] = [{
        _id: 'doc1',
        title: 'First Post',
        comments: [{ user: 'Alice', text: 'Great!' }, { user: 'Bob', text: 'Nice!' }]
      }];
      const mapper = createMapper({
        mongoMappingType: 'array_expand',
        mongoArrayField: 'comments',
        fieldMappings: [
          { databaseField: '_id', documentField: 'post_id' },
          { databaseField: 'comments[].user', documentField: 'comment_user' },
          { databaseField: 'comments[].text', documentField: 'comment_text' }
        ]
      });
      const result = mapper.map(documents);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({ post_id: 'doc1', comment_user: 'Alice', comment_text: 'Great!' });
      expect(result.rows[1]).toEqual({ post_id: 'doc1', comment_user: 'Bob', comment_text: 'Nice!' });
    });

    it('should handle primitive array elements', () => {
      const documents: MongoDBDocument[] = [{ _id: 1, tags: ['react', 'vue', 'angular'] }];
      const mapper = createMapper({
        mongoMappingType: 'array_expand',
        mongoArrayField: 'tags',
        fieldMappings: [
          { databaseField: '_id', documentField: 'doc_id' },
          { databaseField: 'tags[]', documentField: 'tag_value' }
        ]
      });
      const result = mapper.map(documents);
      expect(result.rows).toHaveLength(3);
      expect(result.rows.map(r => r.tag_value)).toEqual(['react', 'vue', 'angular']);
    });
  });

  describe('Data Type Transformations', () => {
    it('should transform string to number', () => {
      const documents: MongoDBDocument[] = [{ _id: 1, price: '29.99' }];
      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [{
          databaseField: 'price',
          documentField: 'price_number',
          transform: { type: 'number' }
        }]
      });
      const result = mapper.map(documents);
      expect(result.rows[0].price_number).toBe(29.99);
      expect(typeof result.rows[0].price_number).toBe('number');
    });

    it('should transform string to boolean', () => {
      const documents: MongoDBDocument[] = [{ _id: 1, active: 'true' }, { _id: 2, active: 'false' }];
      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [{
          databaseField: 'active',
          documentField: 'is_active',
          transform: { type: 'boolean' }
        }]
      });
      const result = mapper.map(documents);
      expect(result.rows[0].is_active).toBe(true);
      expect(result.rows[1].is_active).toBe(false);
    });
  });

  describe('Export Functionality', () => {
    const sampleTableData: TableData = {
      columns: [
        { name: 'id', type: 'number', required: true },
        { name: 'name', type: 'string', required: true }
      ],
      rows: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
      metadata: { totalRows: 2, totalColumns: 2, mappingType: 'flatten', sourceCollection: 'test', generatedAt: '2024-01-01T00:00:00.000Z' }
    };

    it('should export to CSV with headers', () => {
      const csv = exportToCSV(sampleTableData);
      expect(csv).toContain('"id","name"');
      expect(csv).toContain('"1","John"');
      expect(csv).toContain('"2","Jane"');
    });

    it('should export to JSON with full metadata', () => {
      const json = exportToJSON(sampleTableData);
      const parsed = JSON.parse(json);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.columns).toHaveLength(2);
      expect(parsed.data).toHaveLength(2);
    });

    it('should export to array format', () => {
      const array = exportToArray(sampleTableData);
      const parsed = JSON.parse(array);
      expect(parsed[0]).toEqual(['id', 'name']);
      expect(parsed[1]).toEqual([1, 'John']);
      expect(parsed[2]).toEqual([2, 'Jane']);
    });
  });

  describe('Quick API', () => {
    it('should work with quickMap', () => {
      const documents: MongoDBDocument[] = [{ _id: 1, name: 'John', age: 30 }];
      const result = quickMap(documents, {
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'name', documentField: 'name' }
        ]
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual({ id: 1, name: 'John' });
    });

    it('should work with quickExport', () => {
      const tableData: TableData = {
        columns: [{ name: 'id', type: 'number', required: true }],
        rows: [{ id: 1 }],
        metadata: { totalRows: 1, totalColumns: 1, mappingType: 'flatten', sourceCollection: 'test', generatedAt: new Date().toISOString() }
      };
      const csv = quickExport(tableData, 'csv');
      expect(csv).toContain('"1"');
    });
  });
});
