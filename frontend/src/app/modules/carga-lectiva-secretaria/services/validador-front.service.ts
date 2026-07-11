import { Injectable } from '@angular/core';
import { ValidacionDrop, BloqueHorario, DocenteAsignador } from '../models/asignador.models';

@Injectable({ providedIn: 'root' })
export class ValidadorFrontService {

  validarDrop(
    dia: number,
    horaInicio: string,
    horaFin: string,
    docente: DocenteAsignador,
    ambientes: any[],
    ambienteId: number,
    bloquesDocente: BloqueHorario[],
    bloquesAmbiente: BloqueHorario[],
  ): ValidacionDrop {
    const errores: string[] = [];
    const advertencias: string[] = [];

    const hi = this.timeToMinutes(horaInicio);
    const hf = this.timeToMinutes(horaFin);

    if (hf <= hi) {
      errores.push('La hora fin debe ser posterior a la hora inicio');
      return { valido: false, errores, advertencias };
    }

    if (hi < 420 || hf > 1320) {
      errores.push('La franja horaria debe estar entre 07:00 y 22:00');
    }

    for (const b of bloquesDocente) {
      if (b.dia !== dia) continue;
      const bhi = this.timeToMinutes(b.horaInicio);
      const bhf = this.timeToMinutes(b.horaFin);
      if (hi < bhf && hf > bhi) {
        errores.push(`Conflicto con ${b.label} (${b.horaInicio}-${b.horaFin})`);
      }
    }

    for (const b of bloquesAmbiente) {
      if (b.dia !== dia) continue;
      const bhi = this.timeToMinutes(b.horaInicio);
      const bhf = this.timeToMinutes(b.horaFin);
      if (hi < bhf && hf > bhi) {
        errores.push(`Aula ocupada por ${b.label} (${b.horaInicio}-${b.horaFin})`);
      }
    }

    const duracionHoras = (hf - hi) / 60;
    if (docente) {
      const nuevaTotal = docente.horasLectivasAsignadas + duracionHoras;
      if (nuevaTotal > docente.horasLectivasMax) {
        errores.push(`Excede carga máxima: ${nuevaTotal}h > ${docente.horasLectivasMax}h`);
      }
      if (nuevaTotal < 16 && docente.horasLectivasAsignadas === 0) {
        advertencias.push(`Carga menor al mínimo: ${nuevaTotal}h < 16h`);
      }
    }

    if (docente?.enSuspension) {
      errores.push('El docente tiene suspensión vigente');
    }

    return {
      valido: errores.length === 0,
      errores,
      advertencias,
    };
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
