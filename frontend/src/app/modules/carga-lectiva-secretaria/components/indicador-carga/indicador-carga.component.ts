import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { DocenteAsignador } from "../../models/asignador.models";
import { toSafeString } from "@app/shared/utils/sanitize";

@Component({
  selector: "app-indicador-carga",
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="indicador" [class.indicador--completo]="horasLectivasAsignadasNum >= 16" [class.indicador--excedido]="horasLectivasAsignadasNum > horasLectivasMaxNum">
      <div class="indicador__header">
        <div class="indicador__avatar">{{ apellidoInicial }}{{ nombreInicial }}</div>
        <div class="indicador__info">
          <span class="indicador__nombre">{{ apellidoTexto }}, {{ nombreTexto }}</span>
          <span class="indicador__meta">{{ categoriaTexto }} · {{ formatModalidad(modalidadTexto) }}</span>
        </div>
      </div>
      <div class="indicador__barra">
        <div class="indicador__track">
          <div class="indicador__fill" [style.width.%]="porcentaje"></div>
          <div class="indicador__min-marker" [style.left.%]="minPct" [matTooltip]="\'Mínimo 16h\'"></div>
        </div>
        <div class="indicador__nums">
          <span>{{ horasLectivasAsignadasNum }}h</span>
          <span class="indicador__max">/ {{ horasLectivasMaxNum }}h</span>
        </div>
      </div>
      <div class="indicador__detail">
        <span [class.text-warn]="horasRestantesNum < 0" [class.text-ok]="horasRestantesNum >= 0">
          {{ horasRestantesNum >= 0 ? horasRestantesNum + "h disponibles" : Math.abs(horasRestantesNum) + "h excedidas" }}
        </span>
        <span *ngIf="horasNoLectivasNum > 0" class="text-muted">
          · {{ horasNoLectivasNum }}h no lectivas
        </span>
      </div>
    </div>
  `,
  styles: [`
    .indicador {
      background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 10px; padding: 12px; transition: border-color 200ms;
    }
    .indicador--completo { border-color: #16a34a; }
    .indicador--excedido { border-color: #ef4444; background: #fef2f2; }
    .indicador__header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .indicador__avatar {
      width: 36px; height: 36px; border-radius: 8px;
      background: var(--color-primary, #6366f1); color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
    }
    .indicador__info { display: flex; flex-direction: column; }
    .indicador__nombre { font-size: 13px; font-weight: 700; color: var(--color-text, #1e293b); }
    .indicador__meta { font-size: 10px; color: var(--color-text-muted, #94a3b8); }
    .indicador__barra { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .indicador__track { flex: 1; height: 8px; background: var(--color-border, #e2e8f0); border-radius: 4px; position: relative; overflow: visible; }
    .indicador__fill {
      height: 100%; border-radius: 4px; transition: width 300ms ease;
      background: linear-gradient(90deg, #22c55e 0%, #6366f1 75%, #f59e0b 90%, #ef4444 100%);
    }
    .indicador__min-marker {
      position: absolute; top: -2px; width: 2px; height: 12px;
      background: #f59e0b; border-radius: 1px;
    }
    .indicador__nums { font-size: 12px; font-weight: 700; color: var(--color-text, #1e293b); white-space: nowrap; }
    .indicador__max { color: var(--color-text-muted, #94a3b8); font-weight: 400; }
    .indicador__detail { font-size: 11px; }
    .text-warn { color: #f59e0b; font-weight: 600; }
    .text-ok { color: #16a34a; }
    .text-muted { color: var(--color-text-muted, #94a3b8); }
  `],
})
export class IndicadorCargaComponent {
  @Input() docente!: DocenteAsignador;
  readonly Math = Math;

  ngOnInit() {
    console.log("IndicadorCargaComponent docente:", this.docente);
    console.log("Docente apellido:", this.docente?.apellido);
    console.log("Docente nombre:", this.docente?.nombre);
    console.log("Docente categoria:", this.docente?.categoria);
    console.log("Docente modalidad:", this.docente?.modalidad);
  }

  get porcentaje(): number {
    if (!this.docente || this.horasLectivasMaxNum <= 0) return 0;
    return Math.min(100, (this.horasLectivasAsignadasNum / this.horasLectivasMaxNum) * 100);
  }

  get minPct(): number {
    if (!this.docente || this.horasLectivasMaxNum <= 0) return 0;
    return (16 / this.horasLectivasMaxNum) * 100;
  }

  get horasRestantesNum(): number {
    return Number(this.docente?.horasRestantes) || 0;
  }

  get horasLectivasAsignadasNum(): number {
    return Number(this.docente?.horasLectivasAsignadas) || 0;
  }

  get horasLectivasMaxNum(): number {
    return Number(this.docente?.horasLectivasMax) || 0;
  }

  get horasNoLectivasNum(): number {
    return Number(this.docente?.horasNoLectivas) || 0;
  }

  get apellidoTexto(): string {
    return toSafeString(this.docente?.apellido);
  }

  get nombreTexto(): string {
    return toSafeString(this.docente?.nombre);
  }

  get categoriaTexto(): string {
    return toSafeString(this.docente?.categoria);
  }

  get modalidadTexto(): string {
    return toSafeString(this.docente?.modalidad);
  }

  get apellidoInicial(): string {
    const ape = this.apellidoTexto;
    return ape.charAt(0) || "?";
  }

  get nombreInicial(): string {
    const nom = this.nombreTexto;
    return nom.charAt(0) || "?";
  }

  formatModalidad(mod: string): string {
    const map: Record<string, string> = {
      DEDICACION_EXCLUSIVA: "DE",
      TIEMPO_COMPLETO_40: "TC-40",
      TIEMPO_PARCIAL_20: "TP-20",
      TIEMPO_PARCIAL_12: "TP-12",
      TIEMPO_PARCIAL_10: "TP-10",
      TIEMPO_PARCIAL_8: "TP-8",
    };
    return map[mod] || mod;
  }
}
