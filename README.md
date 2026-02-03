# MongoDB to 2D Table Mapping Skill

A general-purpose, reusable module for converting MongoDB documents to 2D table format with support for both flatten and array_expand mapping modes.

## Features

- **Flatten Mapping Mode**: Converts nested documents to flat columns, arrays to JSON strings
- **Array Expand Mode**: Expands each array element to a separate row
- **Custom Field Mappings**: Flexible field mapping rules with data type transformations
- **Multiple Export Formats**: CSV, JSON, Array format support
- **Comprehensive Error Handling**: Detailed error collection and validation
- **TypeScript Support**: Full type definitions included

## Installation

```bash
npm install mongodb-to-table
```

## Quick Start

```typescript
import { createMapper, quickMap, quickExport } from 'mongodb-to-table';

// Flatten mode
const tableData = quickMap(documents, {
  mongoMappingType: 'flatten',
  fieldMappings: [
    { databaseField: '_id', documentField: 'id' },
    { databaseField: 'user.name', documentField: 'user_name' }
  ]
});

// Export to CSV
const csv = quickExport(tableData, 'csv');
```

## License

MIT
