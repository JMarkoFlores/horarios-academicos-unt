const { DataImportService } = require('./src/modules/data-import/data-import.service');
const { CsvParserService } = require('./src/modules/data-import/csv-parser.service');
const { CsvMapperService } = require('./src/modules/data-import/csv-mapper.service');
const fs = require('fs');
const path = require('path');

async function testImport() {
  // Create minimal test
  const parser = new CsvParserService();
  const mapper = new CsvMapperService();
  
  // Test ambientes CSV
  const ambientesBuffer = fs.readFileSync(path.join(__dirname, 'test-csv', 'ambientes.csv'));
  console.log('Testing ambientes CSV parsing...');
  try {
    const records = await parser.parseCSV(ambientesBuffer);
    console.log('Parsed records:', records.length);
    console.log('First record:', records[0]);
    console.log('LAB-1 record:', records[3]);
    
    // Test mapping
    const mapped = mapper.mapAmbientes(records);
    console.log('Mapped valid:', mapped.valid.length);
    console.log('Mapped invalid:', mapped.invalid.length);
    if (mapped.invalid.length > 0) {
      console.log('First invalid:', JSON.stringify(mapped.invalid[0], null, 2));
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
}

testImport().catch(console.error);