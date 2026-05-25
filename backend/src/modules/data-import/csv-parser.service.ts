import { Injectable, BadRequestException } from '@nestjs/common';
import * as csv from 'csv-parse';

@Injectable()
export class CsvParserService {
  async parseCSV(fileBuffer: Buffer): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      const records: Record<string, any>[] = [];

      const parser = csv.parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      });

      parser.on('readable', function () {
        let record;
        while ((record = parser.read()) !== null) {
          records.push(record);
        }
      });

      parser.on('error', (error) => {
        reject(
          new BadRequestException(`Error al parsear CSV: ${error.message}`),
        );
      });

      parser.on('end', () => {
        if (records.length === 0) {
          reject(new BadRequestException('El archivo CSV está vacío'));
        }
        resolve(records);
      });

      parser.write(fileBuffer);
      parser.end();
    });
  }

  async parseCSVFromString(csvString: string): Promise<Record<string, any>[]> {
    return this.parseCSV(Buffer.from(csvString, 'utf-8'));
  }
}
