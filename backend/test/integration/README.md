# Integration Tests

Este directorio contiene los tests de integración del backend que validan el funcionamiento completo de la API, incluyendo autenticación, base de datos, persistencia, relaciones y transacciones.

## Requisitos Previos

Antes de ejecutar los tests de integración, asegúrate de tener:

1. **PostgreSQL** instalado y ejecutándose
2. **Base de datos de prueba** configurada con las siguientes variables de entorno:

```bash
TEST_DATABASE_HOST=localhost
TEST_DATABASE_PORT=5432
TEST_DATABASE_NAME=horarios_unt_test
TEST_DATABASE_USER=unt_user
TEST_DATABASE_PASSWORD=unt_pass
```

Puedes crear la base de datos de prueba ejecutando:

```bash
createdb horarios_unt_test
```

## Configuración

Los tests de integración utilizan una configuración específica de TypeORM que:

- Usa una base de datos separada para tests
- Habilita `synchronize: true` para crear automáticamente las tablas
- Usa `dropSchema: true` para limpiar la base de datos después de cada test
- No habilita logging para mantener los tests rápidos

## Ejecutar Tests

### Ejecutar todos los tests (unit + integration)
```bash
npm test
```

### Ejecutar solo tests unitarios
```bash
npm run test:unit
```

### Ejecutar solo tests de integración
```bash
npm run test:integration
```

### Ejecutar tests con coverage
```bash
npm run test:cov
```

## Estructura de Tests

### Archivos de Configuración

- **test-config.ts**: Configuración de TypeORM para tests de integración
- **test-helper.ts**: Helpers para crear y cerrar la aplicación de testing
- **seeders/test-data.ts**: Datos de prueba para poblar la base de datos

### Tests Implementados

#### 1. Auth Integration Tests (auth.e2e-spec.ts)
Valida el flujo completo de autenticación:
- Login con credenciales válidas
- Rechazo de login con email incorrecto
- Rechazo de login con contraseña incorrecta
- Rechazo de login con usuario inactivo
- Validación de formato de email
- Validación de contraseña requerida
- Generación de token JWT válido
- Validación de información del usuario en respuesta

#### 2. Horarios Integration Tests (horarios.e2e-spec.ts)
Valida la gestión de horarios:
- Generación de horarios para un período académico
- Rechazo de generación sin autenticación
- Rechazo de generación con usuario sin permisos
- Obtención de horarios de un período
- Obtención de horarios de un docente
- Obtención de horarios de un ambiente
- Obtención de conflictos de un período
- Resolución de conflictos
- Reasignación manual de horarios
- Validación de formato de hora
- Limpieza de horarios de un período
- Validación de roles para limpieza

#### 3. Asignaciones Integration Tests (asignaciones.e2e-spec.ts)
Valida la creación y gestión de asignaciones:
- Creación automática de asignaciones
- Persistencia de asignaciones en base de datos
- Validación de relaciones entre entidades
- Actualización de asignaciones existentes
- Validación de cruces al reasignar
- Eliminación masiva de asignaciones
- Validación de operaciones transaccionales
- Consultas masivas de asignaciones
- Ordenamiento de horarios por día y hora

#### 4. Conflictos Integration Tests (conflictos.e2e-spec.ts)
Valida la detección y resolución de conflictos:
- Detección de conflictos al generar horarios
- Creación de registros de conflictos en base de datos
- Información detallada en conflictos
- Consulta de conflictos por período
- Consulta de conflictos sin resultados
- Inclusión de relaciones en respuesta de conflictos
- Resolución de conflictos
- Requerimiento de autenticación para resolver
- Requerimiento de permisos para resolver
- Manejo de conflictos no existentes
- Validación de cruces de docente
- Validación de cruces de ambiente
- Validación de franja institucional
- Persistencia de conflictos
- Resolución individual de conflictos

## Seeders de Prueba

Los tests utilizan datos de prueba predefinidos en `seeders/test-data.ts`:

- **Usuarios**: 3 usuarios (admin, coordinador, operador)
- **Docentes**: 2 docentes con diferentes categorías y contratos
- **Cursos**: 2 cursos con diferentes características
- **Ambientes**: 2 ambientes (laboratorio y aula)
- **Períodos Académicos**: 2 períodos (2026-I, 2026-II)
- **Grupos**: 2 grupos con relaciones a períodos y cursos

## Limpieza Automática

Los tests de integración incluyen limpieza automática de la base de datos:

- **beforeEach**: Limpia la base de datos antes de cada test
- **afterEach**: No requiere limpieza adicional (dropSchema está habilitado)
- **afterAll**: Cierra la conexión a la base de datos

## Manejo de Errores HTTP

Los tests validan el manejo correcto de errores HTTP:

- **401 Unauthorized**: Para operaciones sin autenticación
- **403 Forbidden**: Para operaciones sin permisos suficientes
- **400 Bad Request**: Para datos inválidos o violaciones de validación
- **404 Not Found**: Para recursos que no existen
- **500 Internal Server Error**: Para errores del servidor

## Validación de Respuestas

Los tests validan que las respuestas de la API:

- Incluyan estructura estándar (data, message, statusCode)
- No expongan información sensible (password_hash, etc.)
- Incluyan relaciones correctamente cargadas
- Sean consistentes con los tipos de datos esperados

## Notas Importantes

1. **Base de Datos Real**: Los tests de integración requieren una base de datos PostgreSQL real, no usan mocks
2. **Limpieza**: La base de datos se limpia automáticamente después de cada test
3. **Tiempo de Ejecución**: Los tests de integración son más lentos que los unitarios debido a la interacción con la base de datos
4. **Aislamiento**: Cada test se ejecuta en un entorno aislado con datos frescos
5. **Transacciones**: Las operaciones que deben ser atómicas se validan correctamente

## Solución de Problemas

### Error: "Connection refused"
Asegúrate de que PostgreSQL esté ejecutándose y que las credenciales sean correctas.

### Error: "Database does not exist"
Crea la base de datos de prueba:
```bash
createdb horarios_unt_test
```

### Error: "Relation does not exist"
Esto debería resolverse automáticamente con `synchronize: true`. Si persiste, verifica que las entidades estén correctamente importadas en `test-config.ts`.

### Tests fallan aleatoriamente
Esto puede ser debido a problemas de concurrencia. Aumenta el timeout en `jest.config.js` si es necesario.
