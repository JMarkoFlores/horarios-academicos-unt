# Implementación: Sección Informativa de Categorías y Pre-asignación de Docentes para SUBSANACION

## Resumen de Cambios

Se han implementado dos funcionalidades principales:
1. **Sección informativa dinámica** que muestra detalles sobre cada categoría de ventana
2. **Endpoint API y UI para pre-asignar docentes seleccionados** a ventanas SUBSANACION

---

## Cambios en el Backend

### 1. Nuevo DTO: `PreAsignarDocentesDto`
**Archivo:** `backend/src/modules/ventanas/dto/pre-asignar-docentes.dto.ts`

```typescript
export class PreAsignarDocentesDto {
  @IsArray()
  @IsNotEmpty()
  docentes_ids: number[];
}
```

### 2. Nuevo Endpoint en Controller
**Archivo:** `backend/src/modules/ventanas/ventanas.controller.ts`

```typescript
@Post(":id/pre-asignar-docentes")
@Roles(ADMINISTRADOR_SISTEMA, COORDINADOR_ACADEMICO, SECRETARIA)
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: "Pre-asignar docentes seleccionados a la cola de una ventana" })
async preAsignarDocentes(
  @Param("id") ventanaId: string,
  @Body("docentes_ids") docentesIds: number[]
)
```

**Requisitos:** Solo usuarios con roles ADMINISTRADOR, COORDINADOR o SECRETARIA pueden usar este endpoint.

### 3. Nuevo Método en Servicio
**Archivo:** `backend/src/modules/ventanas/ventanas.service.ts`

```typescript
async preAsignarDocentes(ventanaId: string, docentesIds: number[]): Promise<any>
```

**Lógica:**
- Valida que la ventana existe y está en estado PROGRAMADA
- Verifica la capacidad disponible de la ventana
- Limpia la cola anterior si existe
- Crea entradas en `cola_docentes` para cada docente seleccionado
- Retorna resumen de docentes asignados

**Validaciones:**
- ✅ Ventana no en curso
- ✅ Capacidad suficiente (docentes_count ≤ (duracion_minutos / intervalo_minutos))
- ✅ Docentes existen en BD

---

## Cambios en el Frontend

### 1. Datos de Categorías
**Archivo:** `frontend/src/app/modules/operador/operador.component.ts`

Se agregó un objeto `categoriasInfo` con información detallada para cada categoría:

```typescript
categoriasInfo = {
  'DECLARACION': { titulo, descripcion, usos, recomendaciones },
  'SUBSANACION': { ... },
  'CAMBIO': { ... },
  'PRINCIPAL': { ... },
  'CONTINGENCIA': { ... }
}
```

### 2. Métodos para Pre-asignación
**Archivo:** `frontend/src/app/modules/operador/operador.component.ts`

Nuevos métodos:
- `abrirSeleccionDocentes(ventana)`: Abre el modal para SUBSANACION
- `cargarDocumentosConConflictos()`: Carga docentes con conflictos del período
- `toggleDocente(docenteId)`: Toggle selección de docente
- `preAsignarDocentes()`: Envía pre-asignación al API
- `cerrarSeleccionDocentes()`: Cierra el modal
- `getCategoriaInfo(categoria)`: Retorna info de categoría

### 3. Sección Informativa en HTML
**Archivo:** `frontend/src/app/modules/operador/operador.component.html`

Se agregó una tarjeta (`mat-card.categoria-info`) que muestra:
- Título de la categoría
- Descripción (para qué sirve)
- Lista de usos comunes
- Recomendaciones de uso

Se renderiza dinámicamente cuando el usuario selecciona una categoría.

### 4. Botón Pre-asignar en Tarjetas
Se agregó un botón en las tarjetas de ventana que:
- Solo aparece para ventanas SUBSANACION en estado PROGRAMADA
- Al hacer clic, abre el modal de selección de docentes

### 5. Modal de Selección de Docentes
Se agregó un overlay modal que permite:
- Cargar docentes con conflictos del período
- Seleccionar/deseleccionar docentes mediante checkboxes
- Ver resumen de cantidad seleccionada
- Pre-asignar los docentes seleccionados al endpoint

### 6. Estilos CSS
**Archivo:** `frontend/src/app/modules/operador/operador.component.scss`

Se agregaron estilos para:
- `.categoria-info`: Tarjeta informativa con gradient y animación
- `.docentes-selection-overlay`: Overlay modal con fondo oscuro
- `.docentes-selection-modal`: Modal con scroll y acciones
- `.docente-checkbox`: Estilos para checkboxes de docentes

---

## Flujo de Uso: Pre-asignación en SUBSANACION

1. **Usuario selecciona categoría SUBSANACION** → Se muestra sección informativa
2. **Sistema crea ventana con `sinAsignarDocentes=true`** (aún no implementado en UI)
3. **Usuario presiona "Pre-asignar"** en tarjeta de ventana
4. **Se carga modal** con docentes que tienen conflictos en el período
5. **Usuario selecciona docentes** que necesitan subsanación
6. **Se envía `POST /ventanas/:id/pre-asignar-docentes`** con los IDs seleccionados
7. **Backend valida y asigna** docentes a la cola
8. **Usuario puede iniciar la ventana** con el grupo seleccionado

---

## API Endpoint

### POST `/ventanas/:id/pre-asignar-docentes`

**Request:**
```json
{
  "docentes_ids": [123, 456, 789]
}
```

**Response (200 OK):**
```json
{
  "data": {
    "ventana_id": "uuid",
    "docentes_asignados": 3,
    "docentes": [
      { "id": 123, "nombre": "Apellido, Nombre", "categoria": "... " }
    ]
  },
  "message": "Docentes pre-asignados exitosamente",
  "statusCode": 200
}
```

**Errores:**
- `404`: Ventana no encontrada
- `400`: Ventana en curso, capacidad insuficiente, o docentes no encontrados
- `403`: Usuario sin permisos (requiere ADMINISTRADOR, COORDINADOR o SECRETARIA)

---

## Próximos Pasos Recomendados

1. **Agregar opción de crear ventana sin pre-asignar** (sinAsignarDocentes=true)
   - Ubicar en UI: checkbox en formulario de creación
   
2. **Mejorar carga de docentes**
   - Actualmente carga docentes con conflictos solo por ID
   - Se puede enriquecer con: nombre, categoría, tipo_contrato, fecha_ingreso

3. **Agregar búsqueda/filtrado en modal**
   - Filtrar por nombre, ID, modalidad
   
4. **Notificaciones selectivas**
   - Para SUBSANACION: notificar solo a docentes pre-asignados
   - No a toda la población candidata

---

## Testing

### Backend
```bash
# Compilar
npm run build

# Ejecutar pruebas (si existen)
npm run test
```

### Frontend
```bash
# Compilar
npm run build

# Ejecutar Cypress/Playwright
npm run e2e
```

### Manual Testing
1. Crear ventana SUBSANACION
2. Presionar botón "Pre-asignar"
3. Seleccionar docentes con conflictos
4. Confirmar asignación
5. Verificar que docentes aparecen en cola al iniciar ventana

---

## Archivos Modificados

**Backend:**
- `backend/src/modules/ventanas/dto/pre-asignar-docentes.dto.ts` (nuevo)
- `backend/src/modules/ventanas/ventanas.controller.ts` (endpoint)
- `backend/src/modules/ventanas/ventanas.service.ts` (método)

**Frontend:**
- `frontend/src/app/modules/operador/operador.component.ts` (métodos + datos)
- `frontend/src/app/modules/operador/operador.component.html` (UI)
- `frontend/src/app/modules/operador/operador.component.scss` (estilos)

**Base de Datos:**
- Sin cambios (se usan tablas existentes: `cola_docentes`, `ventana_atencion`)

---

## Notas Importantes

1. **Capacidad:** El sistema valida que docentes_asignados ≤ capacidad_ventana
2. **Limpieza:** Si ventana tiene cola anterior (PROGRAMADA), se limpia antes de asignar
3. **Docentes:** Los IDs deben corresponder a docentes existentes en BD
4. **Rollback:** Si asignación falla, no se hace rollback automático (considerar transacciones)
5. **Seguridad:** Endpoint protegido con roles, solo usuarios autorizados pueden pre-asignar

