import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'horaFormat', standalone: true })
export class HoraFormatPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    const parts = value.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
}
