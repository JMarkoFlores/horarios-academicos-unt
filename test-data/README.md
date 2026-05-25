# Archivos de Prueba para Importación de Datos

Este directorio contiene archivos CSV de ejemplo para probar el sistema de importación de datos maestros.

## Archivos disponibles

### 1. `cursos.csv`
Contiene una lista de cursos con toda la información requerida.

**Campos:**
- `codigo`: Código único del curso (ej: CC001)
- `nombre`: Nombre del curso
- `creditos`: Número de créditos (1-20)
- `horas_teoria`: Horas de teoría por semana
- `horas_laboratorio`: Horas de laboratorio por semana
- `ciclo`: Número de ciclo/semestre
- `tiene_laboratorio`: true/false

### 2. `ambientes.csv`
Contiene una lista de ambientes (aulas y laboratorios).

**Campos:**
- `codigo`: Código único del ambiente (ej: A101, L101)
- `nombre`: Nombre descriptivo
- `tipo`: AULA o LABORATORIO
- `capacidad`: Número de personas (1-500)
- `estado`: ACTIVO o MANTENIMIENTO

### 3. `docentes.csv`
Contiene una lista de docentes.

**Campos:**
- `codigo`: Código único del docente
- `nombres`: Nombres completos
- `apellidos`: Apellidos
- `email`: Correo electrónico (único)
- `tipo_docente`: ORDINARIO, CONTRATADO, o JEFE_PRACTICA_CONTRATADO
- `categoria`: PRINCIPAL, ASOCIADO, AUXILIAR, o SIN_CATEGORIA
- `modalidad`: DEDICACION_EXCLUSIVA, TIEMPO_COMPLETO_40, TIEMPO_PARCIAL_20, etc.
- `fecha_ingreso`: Fecha en formato YYYY-MM-DD
- `telefono`: Número de teléfono (opcional)

## Cómo usar

1. **Cargar Cursos:**
   - Ir a Configuración → Importación de Datos
   - Seleccionar "Cursos" como tipo de datos
   - Seleccionar archivo `cursos.csv`
   - Revisar preview y confirmar

2. **Cargar Ambientes:**
   - Repetir proceso seleccionando `ambientes.csv`
   - Elegir tipo "Ambientes"

3. **Cargar Docentes:**
   - Repetir proceso con `docentes.csv`
   - Elegir tipo "Docentes"

## Validaciones

El sistema valida automáticamente:
- Campos requeridos no vacíos
- Formatos correctos (email, números, fechas)
- Valores dentro de rangos permitidos
- Códigos únicos
- Capacidades compatibles

Cualquier error se reporta detalladamente en el preview antes de confirmar la importación.

## Para Relaciones (Docente-Curso, Curso-Ambiente)

Estas relaciones requieren IDs ya presentes en la BD:

1. **Obtener los IDs:**
   - Tras cargar cursos/ambientes/docentes, copiar sus IDs desde la UI
   - O consultar directamente en la BD

2. **Crear CSV con IDs:**
   ```csv
   docente_id,curso_id
   1,1
   2,3
   ```

3. **Importar relaciones:**
   - Usar el tipo "Docente-Curso" o "Curso-Ambiente"
   - Proporcionar archivo CSV con IDs

## Notas Importantes

- Los archivos CSV deben incluir encabezados en la primera fila
- Usar comas (,) como separadores
- Las fechas deben estar en formato ISO 8601 (YYYY-MM-DD)
- Los códigos se normalizan a MAYÚSCULAS automáticamente
- Emails se normalizan a minúsculas
- La importación es atómica: si hay errores, no se carga nada
