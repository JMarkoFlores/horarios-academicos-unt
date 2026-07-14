import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'diaNombre',
  standalone: true,
})
export class DiaNombrePipe implements PipeTransform {
  transform(value: number): string {
    const dias = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    return dias[value] || 'Día desconocido';
  }
}
