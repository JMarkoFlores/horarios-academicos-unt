El sistema debe funcionar para cualquier universidad, con la UNT como configuración
predeterminada.Toda restricción institucional — días de clase, franjas horarias, turnos,
modalidades de carga — vive en base de datos y es editable desde el panel de administración,
no en código hardcodeado.Esto incluye la posibilidad de activar el sábado como día
laborable, configurar turnos nocturnos, definir bloques de 2 horas en lugar de 1, o establecer
cualquier rango de franja válida que la institución necesite.[ 2]
Cada universidad que use el sistema tendrá su propio conjunto de parámetros institucionales:
días de semana habilitados (lunes–sábado o cualquier subconjunto), franjas horarias por
turno (mañana, tarde, noche, cualquier combinación), límites mínimos y máximos de carga por
categoría docente, modalidades de trabajo con sus propios topes, y días no laborables
propios de su calendario.
El sistema va más allá de generar horarios: es una plataforma de gestión académica integral.
Las funcionalidades se organizan en tres grandes bloques.[ 2][ 1]
Parámetros de la institución:nombre, logo, colores, días de clase activos (lunes–sábado
configurable), franjas horarias por turno con hora inicio/fin, duración mínima de bloque (1h
o 2h), período académico activo.
Modalidades de carga configurables: cada institución define sus propias categorías
docentes y sus respectivos mínimos y máximos de horas, en lugar de que esos valores
estén en el código.
Calendario académico:fechas de inicio y fin del semestre, días feriados, suspensiones de
clases, eventos institucionales que bloquean aulas.
Plan de Trabajo: Sistema de Horarios Académicos
4 Personas · Multi-Universidad Configurable · Diseño Profesional
Basado en la normativa UNT como caso de uso principal
Principio Fundamental: Configurabilidad Total
1][
Funcionalidades del Sistema (Visión Completa)
3][ 4][
Bloque 1 — Configuración Institucional
Docentes: registro completo con categoría, modalidad, cargo administrativo, antigüedad,
disponibilidad semanal.
Cursos: con horas teóricas, horas prácticas, si requiere laboratorio, ambientes
compatibles.
Ambientes: aulas y laboratorios con capacidad, equipamiento, piso, pabellón, tipo.
Grupos y secciones: vinculados a curso y período.
Preasignaciones: bloqueos fijos antes de correr el motor (ej. docente X siempre dicta el
lunes de 8 a 10 en aula A-101).
Motor de asignaciónautomática con detección de conflictos tipificados.
Sistema de ventanas de atencióncon cola jerárquica y tiempo real.
Dashboard conindicadores operativos y de cumplimiento normativo.
Reportes PDF y Excel listos para entregar a autoridades.
Notificaciones a docentes por correo.
Historial de cambios (auditoría) de toda modificación al horario.
Vista pública del docente: cada docente puede consultar su propio horario desde un link
con token, sin necesidad de login al sistema administrativo.
Antes de escribir una sola línea de código Angular, el equipo debe acordar y documentar el
sistema de diseño completo.Estas decisiones son vinculantes para las 4 personas.[ 6][ 8]
La aplicación tiene un modo claro como predeterminado. La paleta se define como variables
CSS globales y como variables SCSS de Angular Material, no como valores sueltos en
componentes. Los colores UNT son el punto de partida pero el sistema acepta cualquier
paleta institucional desde la configuración.
// _variables.scss — Variables globales del sistema
:root {
// Primarios (azul institucional UNT)
--color-primary-50: #E3F2FD;
--color-primary-100: #BBDEFB;
--color-primary-500: #1565C0; // color base institucional UNT
--color-primary-700: #0D47A1;
--color-primary-900: #0A2F6B;
// Acento (naranja UNT)
--color-accent-500: #FF6F00;
Bloque 2 — Gestión de Datos Maestros
Bloque 3 — Operación y Resultados
Sistema de Diseño — Estándares Profesionales
5][ 7][
Paleta de Colores
--color-accent-700: #E65100;
// Semánticos — estados del sistema
--color-success: #2E7D32;
--color-warning: #F57F17;
--color-error: #C62828;
--color-info: #01579B;
// Neutros — superficies y texto
--color-bg: #F8F9FA;
--color-surface: #FFFFFF;
--color-surface-2: #F1F3F4;
--color-border: rgba(0,0,0,0.12);
--color-text-primary: rgba(0,0,0,0.87);
--color-text-secondary: rgba(0,0,0,0.60);
--color-text-disabled: rgba(0,0,0,0.38);
// Colores de la grilla de horarios
--color-slot-teoria: #BBDEFB; // azul claro
--color-slot-laboratorio: #C8E6C9; // verde claro
--color-slot-seleccion: #FFF9C4; // amarillo — selección temporal
--color-slot-propia: #A5D6A7; // verde — selección propia
--color-slot-bloqueado: #ECEFF1; // gris — no disponible
--color-slot-ocupado: #CFD8DC; // gris oscuro — ocupado por otro
// Espaciado — escala de 4px
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
// Radios
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
// Tipografía
--font-display: 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
--font-body: 'Inter', 'Roboto', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
// Sombras
--shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
--shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05);
}
La jerarquía tipográfica usa exactamente dos familias:Plus Jakarta Sans para títulos y
encabezados (moderna, geométrica, legible a cualquier tamaño), e Inter para cuerpo de texto,
labels, botones y datos de tabla (diseñada específicamente para interfaces digitales densas).
[ 7]
// Escala tipográfica — nunca usar tamaños fuera de esta escala
$type-scale: (
'xs': 12px, // labels de estado, metadata, badges
'sm': 13px, // texto secundario, captions
'base': 14px, // cuerpo de texto en componentes
'md': 16px, // párrafos, labels principales
'lg': 18px, // subtítulos de sección
'xl': 22px, // títulos de página
'2xl': 28px, // headings grandes
'3xl': 36px, // solo para la pantalla de login/splash
);
// Pesos permitidos
$font-weights: (
regular: 400,
medium: 500,
semibold: 600,
bold: 700,
);
Regla de aplicación: todo el texto de tablas, formularios y grillas usa 13–14px (nunca más). Los
títulos de página usan 22px. Los encabezados de sección usan 16–18px.Esto evita el error
común de hacer las interfaces académicas ilegibles por texto demasiado pequeño o demasiado
grande.[ 7]
Antes de construir módulos, el equipo de frontend (Persona 4) debe tener estos
componentes base documentados y funcionales en src/app/shared/:
Componente Propósito
AppBadge Badges de estadocon color semántico(categoría docente, estadohorario, tipocontrato)
AppKpiCard Card de indicador con valor numéricogrande, label, tendencia y color
AppDataTable Tabla con paginación, sorting y filtros incorporados
AppGrilla La grilla semanal de horarios, reutilizable en disponibilidad, visualización y operador
AppToast Notificaciones en pantalla: éxito, error, advertencia, información
AppConfirmDialog Dialog de confirmación para acciones destructivas, con doble confirmación opcional
AppEmptyState Estadovacíocon ilustración, mensaje y acción primaria
AppSpinner Loading overlay para secciones y botones
Tipografía
6][
9][
Componentes Reutilizables Obligatorios
Componente Propósito
AppPeriodSelector Selector global de períodoacadémico, presente en toda la app
Persona 1 construye todo lo que el resto del equipo necesita para existir: la infraestructura
técnica, la base de datos con todas sus tablas, el sistema de autenticación completo con 5
roles, y los módulos de configuración institucional que hacen al sistema adaptable a cualquier
universidad.También implementa los primeros módulos CRUD del backend (Docentes,
Cursos, Ambientes, Disponibilidad, Grupos) y el servicio de validaciones que todos los demás
módulos van a consumir.
El trabajo de Persona 1 parte del admin parcialmente implementado: lo completa, lo extiende
y construye encima. La filosofía de este bloque es "configurar, no hardcodear": ninguna
restricción institucional debe estar fija en el código. Franjas horarias, días de clase, límites de
carga, categorías docentes — todo entra en base de datos y se gestiona desde el panel de
administración.
Lo más importante de este bloque: el módulo de ConfiguraciónInstitucional, que es nuevo y
no estaba en los prompts originales. Sin él, el sistema es rígido y solo sirve para la UNT. Con
él, cualquier universidad puede adaptarlo en minutos desde la interfaz de administración.
1. Repositorio Git operativo con la estructura de carpetas completa, docker-compose.yml
funcional, y las instrucciones en el README.md para levantar el proyecto con un solo comando.
2. Base de datos completa:todas las tablas creadas mediante migración TypeORM, incluyendo
las tablas nuevas de configuracion_institucional, turno_horario, parametros_carga y
dias_semana_activos. La migración debe ejecutarse sin errores con npm run migration:run.
3.Módulo de ConfiguraciónInstitucionaltotalmente funcional desde la API, con los
siguientes datos configurables:
Información de la institución (nombre, logo URL, colores en hex)
Días de semana activos (lunes–sábado, cualquier combinación, incluyendo sábado)
Turnos horarios: cada turno tiene nombre, hora inicio, hora fin, activo/inactivo (ej:"Turno
Mañana", 07:00, 13:00).Pueden existir 2, 3 o más turnos
Duración mínima de bloque de clase: 1 hora (default) o configurable
Período académico con fechas de inicio y fin de clases
PERSONA 1 — Fundamentos del Sistema
Cimientos configurables, seguros y normalizados
Qué tiene que hacer
Qué debe entregar
Parámetros de carga por modalidad: para cada combinación de (tipo_contrato ×
modalidad_trabajo), los mínimos y máximos de horas de clase y de preparación/evaluación
4. Sistema Authcompleto con 5 roles (ADMIN, COORDINADOR, OPERADOR, DOCENTE,
VISUALIZADOR), JWT, guards, decoradores @Roles() y @CurrentUser(), y endpoints
/auth/login, /auth/refresh, /auth/perfil.
5. CRUD backend completo de: Docentes, Cursos, Ambientes, Grupos y Disponibilidad.Todos
con paginación, filtros, validaciones y respuesta estandarizada { data, message, statusCode
}.
6. Servicio de Validaciones Globales (ValidacionesService) con detección de cruces de
docente, ambiente y grupo, verificación de disponibilidad declarada, verificación de franja
institucional (usando los turnos configurados, no valores hardcodeados), y verificación de
límites de carga (usando los parámetros de carga configurados).
7. Seed actualizado con: 1 usuario admin, 1 período académico 2026-I con fechas reales de la
UNT, 8 docentes (5 nombrados + 3 contratados) con su modalidad_trabajo, 8 cursos, 4 aulas, 2
laboratorios, y los parámetros institucionales de la UNT precargados (turnos mañana 07:00–
13:00 y tarde 14:00–20:00, días lunes–sábado, modalidades con sus límites del Reglamento
UNT).
8. ColecciónPostmanexportada con todas las peticiones organizadas por módulo y con
variables de entorno para base_url y token.
9. Archivo ENTREGA_P1.md con: listado de endpoints implementados, descripción del modelo de
configuración institucional (cómo se usa, qué parámetros existen), y explicación de cómo el
ValidacionesService consume los parámetros configurados en lugar de valores
hardcodeados.
docker-compose up -d levanta sin errores
npm run migration:run crea todas las tablas sin errores
npm run seed termina sin errores
POST /auth/login retorna JWT válido
GET /configuracion/turnos retorna los turnos configurados (mañana y tarde para UNT)
GET /configuracion/dias-activos retorna los días habilitados (incluido sábado en UNT)
GET /docentes/jerarquia?periodo=2026-I retorna docentes en orden jerárquico
POST /disponibilidad/docente/:id rechaza slots fuera de los turnos configurados
Swagger en /api/docs con todos los endpoints documentados
Verificaciones antes de pasar el proyecto
Persona 2 recibe el backend con CRUD completo y configuración institucional funcionando, y
construye el corazóndel sistema: el algoritmo que genera horarios automáticamente
respetando todas las restricciones configuradas, el sistema de ventanas de atención con cola
jerárquica para que los docentes elijan sus slots en tiempo real, el gateway WebSocket que
mantiene a todos los clientes sincronizados, el módulo de preasignaciones para bloqueos
fijos, y el sistema de auditoría que deja registro de cada cambio.
La clave de este bloque es que el motor no puede tener ninguna restricciónhardcodeada:
consulta los parámetros institucionales configurados por Persona 1 para saber qué días son
válidos, qué turnos existen, cuáles son los límites de carga de cada docente, y qué días son no
laborables.El motor es el mismo para la UNT o para cualquier otra universidad; solo cambia la
configuración.
1.Motor de Asignación Automática completamente funcional: genera horarios para un
período académico completo, respeta turnos configurados, días activos, límites de carga por
docente, disponibilidad declarada, preasignaciones y días no laborables. Detecta y registra
conflictos tipificados (sin docente, sin slot, cruce docente/ambiente/grupo, carga insuficiente,
carga excedida, incompatibilidad laboral, franja inválida).
2. Reasignaciónmanual convalidación: endpoint para mover una celda del horario a otro slot,
validando cruces y límites antes de confirmar el cambio.
3.Módulo de Ventanas de Atencióncompleto: crear ventana con fecha y rango horario, iniciar
la cola en orden jerárquico, llamar al siguiente docente, gestionar selecciones temporales
(con expiración de 30 minutos limpiada por cron job), y confirmar selección convirtiéndola en
HorarioAsignado. Antes de confirmar, verificar que el docente no supera su máximo de carga.
4.WebSocket Gateway con eventos: cola_actualizada, celda_seleccionada, celda_liberada,
horario_confirmado, alerta_carga. Los clientes se suscriben por sala (ventana_${id}).
5.Módulo de Preasignaciones CRUD: registro de asignaciones fijas que el motor debe
respetar. Un docente tiene fijada una clase en día/hora/aula específica y el motor no puede
tocar ese slot.
6. Sistema de Auditoría:tabla auditoria_log con registro automático de toda creación,
modificación y eliminación de HorarioAsignado, incluyendo quién hizo el cambio, desde qué IP,
qué tenía antes y qué tiene después.
7. Endpoint de verificaciónnormativa: GET /horarios/verificar-cargas?periodo= que recorre
todos los docentes del período y reporta cuáles están por debajo de su mínimo de horas y
PERSONA 2 — Núcleo Inteligente del Sistema
Motor de asignación, tiempo real y trazabilidad
Qué tiene que hacer
Qué debe entregar
cuántas horas les faltan.
8. ColecciónPostmanactualizada con las peticiones nuevas de horarios, ventanas y
preasignaciones.
9. Archivo ENTREGA_P2.md con: descripción del algoritmo de asignación (flujo paso a paso,
cómo consulta los parámetros configurados), tipos de conflicto implementados con ejemplos
de cuándo se disparan, y cómo funciona el sistema de ventanas con la cola jerárquica.
POST /horarios/generar { "periodo": "2026-I" } genera asignaciones y retorna conteo
de asignaciones y conflictos
Los slots generados están dentro de los turnos configurados (no fuera de ellos)
GET /horarios/verificar-cargas?periodo=2026-I retorna lista de cumplimiento por
docente
El WebSocket Gateway inicia y emite eventos sin errores
POST /ventanas/:id/celda rechaza slots fuera de los turnos configurados en
ConfiguracionInstitucional
El cron de limpieza de selecciones expiradas corre cada 5 minutos sin errores
Tabla auditoria_log registra cada cambio de HorarioAsignado
Persona 3 recibe el backend completo con motor y WebSocket funcionando, y construye todo
lo que hace al sistema visible y útil para autoridades, coordinadores y docentes: los reportes
en PDF y Excel que se entregan a decanatos y jefaturas, el dashboard con indicadores de
gestión, el sistema de notificaciones automáticas por correo, y las vistas de consulta pública
para docentes (que no requieren login al sistema administrativo).
La característica diferencial de este bloque es que los reportes PDF deben parecerse a los
documentos oficiales que actualmente se imprimen en las universidades, no a reportes
genéricos.El reporte individual del docente debe verse como el Formato N° 3 del Reglamento
de Carga Horaria de la UNT: con membrete institucional, tabla de horario por día/hora, y
resumen de carga al pie.[^10]
Verificaciones antes de pasar el proyecto
PERSONA 3 — Resultados, Reportes y Comunicación
Todo lo que convierte datos en información útil
Qué tiene que hacer
1. Cuatro tipos de reporte PDF generados con Puppeteer, todos con membrete institucional
(nombre universidad, facultad, escuela) y con diseño cuidado usando tipografía Inter 13–14px,
colores institucionales y tablas limpias:
Reporte individual del docente:tabla de horario semanal (días × horas, con turnos
configurados), resumen de carga con indicador de cumplimiento normativo, datos del
docente (nombre, categoría, modalidad, código).
Reporte de ambiente: horario del aula o laboratorio por semana, con docente, curso y
grupo en cada celda.
Reporte operacional completo:todos los docentes con su carga asignada vs. mínimo
normativo, todos los ambientes con su ocupación, lista de conflictos no resueltos, lista de
docentes en incumplimiento normativo.
Reporte de gestión: indicadores clave (% docentes asignados, % ocupación aulas y labs,
conflictos activos, % cumplimiento normativo), distribución de carga por categoría, top 5
mayor y menor carga, cursos sin asignar.
2. Exportación Excel con 4 hojas: horarios por docente, horarios por ambiente, conflictos,
cumplimiento normativo. Generado con exceljs, con formato de tabla, cabeceras resaltadas y
datos alineados.
3.Dashboard conKPIs en el backend: endpoint que retorna en un solo objeto todos los
indicadores del sistema para el período seleccionado, incluyendo los indicadores normativos
(% de docentes que cumplen su mínimo de carga, docentes en incumplimiento con detalle de
cuántas horas les faltan).
4. Sistema de notificaciones por correo con tres plantillas HTML profesionales:
Recordatorio 24 horas antes del turno de selección.
Recordatorio 15 minutos antes.
Confirmación de horario asignado (con tabla del horario incluida en el correo).
Los envíos son asíncronos mediante colas BullMQ, no bloqueantes.
5. Endpoint de consulta pública del docente: GET /publico/docente/:token/horario — cada
docente tiene un token único (UUID) que le permite consultar su horario desde un link sin
necesidad de autenticarse.Ideal para compartir por correo o WhatsApp.El token se puede
regenerar desde el panel de administración.
6.Preferencias de notificacióndel docente: el docente (o el admin en su nombre) puede
configurar siquiere recibir notificaciones por correo y qué correo usar.
7. Archivo ENTREGA_P3.md con: instrucciones para configurar el servidor de correo (variables de
entorno necesarias), descripción de los KPIs del dashboard y cómo se calculan, y capturas de
los PDFs generados de muestra.
8.PDFs de muestra generados para el período 2026-I adjuntos en la carpeta docs/reportesmuestra/.
Qué debe entregar
GET /reportes/docente/:id/pdf?periodo=2026-I descarga un PDF con diseño cuidado y
membrete
El PDF del docente muestra el indicador de cumplimiento normativo
GET /reportes/operacional/excel?periodo=2026-I descarga un .xlsx con 4 hojas
GET /dashboard/kpis?periodo=2026-I retorna porcentaje_cumplimiento_normativo
GET /publico/docente/:token/horario retorna el horario sin JWT
Las notificaciones por correo se encolan sin errores (aunque el servidor de correo no esté
configurado, la cola debe funcionar)
npm run start:dev sin errores TypeScript
Persona 4 recibe el backend 100% completo y construye toda la interfaz de usuario: desde el
login hasta el módulo operador en tiempo real.Es el bloque más extenso porque convierte
semanas de backend en algo que las personas reales van a usar, y la calidad visual y funcional
de este bloque determina la percepción completa del sistema.
El enfoque de diseño es "aplicaciónde gestiónprofesional": limpio, denso en información pero
no sobrecargado, con jerarquía visual clara, feedback constante al usuario y zero estados
vacíos sin mensaje. La referencia visual es aplicaciones como Linear, Notion o sistemas ERP
modernos: interfaces que priorizan la eficiencia sobre la decoración.[ 8][ 9]
La grilla de horarios (AppGrilla) es el componente más importante del sistema y debe ser
perfecta: renderiza los turnos dinámicamente desde la configuración institucional (no
hardcodeados), funciona en modo solo-lectura y en modo interactivo, y actualiza celdas en
tiempo real via WebSocket.
1. Sistema de diseño documentado en src/app/shared/design-system/:
_variables.scss con todos los tokens de color, tipografía, espaciado y radios definidos
arriba.
_typography.scss con las clases de tipografía del sistema (.text-xs, .text-sm, .text-base,
etc.).
_utilities.scss con clases utilitarias de spacing y layout.
theme.scss con el tema Angular Material personalizado usando los tokens
institucionales.
Verificaciones antes de pasar el proyecto
PERSONA 4 — Experiencia de Usuario
Todo lo que se ve, se toca y se vive
Qué tiene que hacer
11][ 5][
Qué debe entregar
Fuentes cargadas:Plus Jakarta Sans (headings) y Inter (body) desde Google Fonts con
font-display: swap.
2. Componentes compartidos en src/app/shared/components/ completamente funcionales y
documentados con JSDoc:
AppBadge, AppKpiCard, AppDataTable, AppGrilla, AppToast, AppConfirmDialog, AppEmptyState,
AppSpinner, AppPeriodSelector.
El componente AppGrilla es crítico: recibe como @Input() los turnos configurados (del
endpoint GET /configuracion/turnos) y los días activos (GET /configuracion/dias-activos), y
construye la grilla dinámicamente. De esta forma, sila institución activa el sábado o agrega un
turno nocturno, la grilla lo muestra automáticamente sin cambios de código.
3.Módulo Logincon diseño cuidado: logo institucional centrado, formulario limpio, mensaje
de error inline (no toast), animación de carga en el botón, redirección automática siya hay
sesión activa.
4.Layout Principal con sidebar fijo (colapsable en mobile con botón hamburguesa), selector de
período académico global en el topbar, y breadcrumb de navegación.El sidebar muestra solo
las opciones que el rol del usuario puede usar (ADMIN ve todo; DOCENTEsolo ve su horario
y disponibilidad; VISUALIZADOR solo ve horarios).
5.Dashboard con: 6 cards KPI(incluyendo % cumplimiento normativo), gráfico de barras de
distribución de carga por categoría (con línea del mínimo normativo superpuesta), gráfico de
dona de ocupación de ambientes, tabla de conflictos activos con badges por tipo, y botones de
acción rápida (generar horario, verificar cumplimiento).
6.Módulos CRUD de Docentes, Cursos y Ambientes:tablas con paginación, sorting y filtros,
formularios reactivos con validación en tiempo real, estados de carga y error manejados
visualmente, y mensajes de confirmación para acciones destructivas.
7.Módulo de Disponibilidad: grilla interactiva que carga los turnos y días desde la
configuración institucional, con acciones masivas (marcar turno completo, limpiar turno,
marcar todo), indicador de horas disponibles vs. mínimo normativo, y guardado con feedback
visual.
8.Módulo de Horarios con 4 vistas:
Por docente: grilla de solo lectura con indicador de cumplimiento normativo, botón
descargar PDF.
Por ambiente: grilla de solo lectura mostrando la ocupación.
Conflictos:tabla con badges de tipo, resaltando en rojo los conflictos normativos.
Gestión(ADMIN/COORDINADOR): botones de acción con spinners, resultado postgeneración.
9.Módulo Operador con WebSocket en tiempo real: panel de cola con estados visuales, grilla
de selección dinámica (turnos desde config), mini-dialog para confirmar celda con selector de
curso y ambiente, indicador de carga en tiempo real, y actualización instantánea al recibir
eventos del servidor.
10.Módulo Reportes: interfaz para seleccionar tipo de reporte, docente/ambiente siaplica,
período, y descargar.Incluye preview del nombre del archivo que se va a descargar.
11.Módulo de ConfiguraciónInstitucional (solo ADMIN):formulario para editar nombre de
institución, logo URL, gestión de turnos horarios (crear, editar, activar/desactivar), gestión de
días activos (checkboxes lunes–sábado), y vista de parámetros de carga por modalidad.
12.Página 404 con mensaje amigable y botón de regreso.
13. Vista pública del docente: ruta /horario/:token sin autenticación que muestra el horario
del docente en la grilla de solo lectura, con el nombre del docente, período y botón de
descarga PDF.Esta es la vista que el docente puede compartir por correo o WhatsApp.
14. README.md completo en la raíz del proyecto con: descripción del sistema, stack tecnológico,
instrucciones de instalación y ejecución paso a paso (tres comandos máximo para levantar
todo), credenciales por defecto, estructura de módulos, y referencia normativa (Reglamento
UNT RCU 296-2008 como caso de uso base).
15. Archivo ENTREGA_P4.md con: capturas de pantalla de cada módulo en desktop y mobile
(375px), descripción del sistema de diseño implementado, y notas de QA (qué se probó, en qué
navegadores).
Estos son los criterios mínimos de diseño que el frontend debe cumplir:[ 5][^9]
Tipografía: cuerpo de texto en tablas y formularios 13–14px (Inter).Títulos de página 22px
(Plus Jakarta Sans Semibold). Sin texto más pequeño que 12px en ningún punto.
Espaciado:todo margen, padding y gap usa los tokens de --space-*. Cero pixeles
arbitrarios en ningún componente.
Color: los colores de celdas de la grilla (--color-slot-*) son consistentes en toda la
aplicación. Un badge de categoría "PRINCIPAL" siempre es el mismo azul, en cualquier
pantalla.
Estados vacíos: ninguna tabla, lista o grilla muestra un estado vacío sin mensaje y acción
primaria.El componente AppEmptyState se usa en todos.
Loading: ningún botón de acción ejecuta una llamada HTTP sin mostrar estado de carga.
El componente AppSpinner se usa en todos los botones críticos.
Feedback:toda operación exitosa muestra un toast verde.Todo error muestra un toast
rojo con el mensaje de la API, no un "Error genérico".
Responsive: el sistema es usable en tablet (768px) y desktop (1280px+).En mobile (375px)
el sidebar colapsa y las tablas tienen scroll horizontal.
Consistencia Angular Material: usar los componentes de Angular Material con el tema
personalizado. Cero CSS de Bootstrap o Tailwind mezclado.
Estándares de calidad no negociables para el frontend
7][
ng serve sin errores TypeScript
Login funciona y redirige correctamente por rol
Grilla de disponibilidad muestra los turnos configurados (si se agrega un turno nocturno
en la config, aparece en la grilla sin cambios de código)
Dashboard muestra todos los KPIs incluyendo cumplimiento normativo
Módulo Operador conecta al WebSocket y actualiza celdas en tiempo real
Vista pública /horario/:token funciona sin login
Módulo de Configuración Institucional permite activar/desactivar el sábado y el cambio se
refleja inmediatamente en la grilla
Todas las tablas tienen estado vacío con AppEmptyState
Todos los botones de acción tienen estado de carga
Sin texto hardcodeado de colores de institución en ningún componente (todo viene de la
config)
Estas funcionalidades agregan valor real sin complejidad excesiva.Pueden distribuirse entre
las personas según el tiempo disponible o reservarse para una segunda fase:[ 4][ 3]
Funcionalidad Qué hace
Quién la
añade
Importación de docentes
desde Excel
El admin sube un .xlsxcon docentes y el sistema los importa
masivamente
P1oP3
Vista del docente
logueado
El docente con rol DOCENTE ve su propiohorario, disponibilidad y
confirmaciones sin accesoal sistema administrativo
P4
Historial de versiones del
horario
Antes de cada regeneración, guarda una snapshot del horario
anterior para poder comparar orevertir
P2
Exportación del calendario
del docente
Descarga el horariodel docente en formato.icspara importar en
Google Calendar oOutlook
P3
Modo oscuro Toggle claro/oscurousandoCSS variables ya definidas P4
Filtro de horario por ciclo
En la vista de horarios, filtrar por cicloacadémico(1–10) para ver solo
los cursos de ese ciclo
P4
Drag & drop en
reasignación manual
En la vista de horarios, arrastrar una celda a otroslot para reasignar P4
Estadísticas de uso de la
ventana
Cuántotardócada docente en confirmar su selección, históricode
turnos
P3
Verificaciones antes de hacer el PR final
Funcionalidades Adicionales Opcionales
2][ 1][
Cada transferencia es una entrega formal. La persona que termina debe:[ 3]
1.Ejecutar todos los comandos de verificación de su checklist y capturar la terminal sin
errores.
2. Hacer commit en su rama (dev/persona-N) con el mensaje convencional definido.
3. Crear un Pull Request hacia main con los checklist marcados como comentario.
4. Compartir en el canal del grupo: la captura de terminal, los archivos de entrega
(ENTREGA_PN.md, colección Postman siaplica) y una nota de "listo para transferir".
5. Hacer una reunión de 30 minutos con la siguiente persona para transferir contexto
verbal: qué se hizo, qué decisiones de diseño se tomaron, qué no se terminó y por qué.
La siguiente persona no empieza hasta recibir confirmación de que el PR está aprobado y la
reunión de transferencia se realizó.
Persona Responsabilidad central Duración Entregable clave
P1
Infraestructura + Configuración
institucional configurable +Auth + CRUD
backend +Validaciones
5–7 días
Sistema levanta, configuración
institucional editable desdeAPI, CRUD
funcionando
P2
Motor de asignación +Ventanas de
atención +WebSocket +Preasignaciones +
Auditoría
5–7 días
Motor genera horarios respetandoconfig
dinámica, WebSocket activo, auditoría
completa
P3
Reportes PDF/Excel + Dashboard +
Notificaciones +Vista pública del docente
5–6 días
PDFs con diseñoprofesional, dashboard
con KPIs normativos, correos encolados
P4
Frontend Angular completocon sistema de
diseño, todos los módulos, WebSocket,
config dinámica
7–9 días
Grilla configurable, sistema de diseño
documentado, vista pública, módulo
operador en tiemporeal
Total estimado: 22–29 días calendario en secuencia estricta.
1. College Timetable Software by vmedulife | Smarter Academic ... - vmedulife's college
timetable software helps institutions automate scheduling, avoid conflicts, and ...
2. School Timetable Management Software - Myschoolone - Organize academic schedules
effortlessly with automated timetable creation, smart conflict handling,...
3. SmartSchedule AI - Intelligent College Timetable Generator - Devpost - What it does.
SmartSchedule AIis an intelligent timetable generation system that automatically crea...
4.Automated Timetabler | Automated University Scheduling Software - Key Features ·
Automatic generation of timetables for classes, teachers, and students ·Intelligent ...
Protocolo de Transferencia entre Personas
5][
Resumen por Persona
References
5. T03: Design Systems for Better UX | HCI International 2024 - This tutorial will cover general
design system principles and best practices, including, style guide...
6. Customizing Typography - Angular Material - You can define a typography level with the
define-typography-config Sass function.This function acc...
7. Mastering Angular Material: A Comprehensive Guide To Theming ... - Mastering Angular
Material: A Comprehensive Guide to Theming and Styling. Nov 17, 2024 ...This syst...
8.What is a Design System? A 2026 Guide With Best Practice Examples - A design system is a
collection of reusable UI elements that product teams use and build on to creat...
9.10 UX Best Practices for Optimal User Experience in 2024 | Windmill - 1.Mobile-First Design ·
2. Accessibility · 3.Performance Optimization · 4.Minimalistic Design · 5...
10. ingdelsoftwarelibro9_sommerville.pdf
11.13 Best Design System Examples to Learn From in 2026 - UXPin - Discover what a design
system is and explore 13 real-world examples from Google, Apple, IBM, Shopify...

---

## Funcionalidades Adicionales Propuestas

### Exportación y Compartición

**Exportaciones Avanzadas**
- Exportación en CSV (además de Excel y PDF)
- Exportación en formato iCalendar (.ics) para sincronizar con Google Calendar/Outlook
- Exportación en formato PNG/JPEG de la grilla de horarios (para compartir por WhatsApp)

**Compartición Social**
- Generación de QR code del horario del docente
- Enlace corto (bit.ly-style) para compartir horarios
- Widget embebible para sitio web de la facultad

### Gestión de Aulas y Recursos

**Optimización de Espacios**
- Mapa interactivo del campus con ubicación de aulas
- Distancia entre aulas consecutivas para el mismo docente
- Alerta si el docente tiene que cambiar de edificio muy rápido
- Sugerencia de aulas cercanas para evitar traslados largos

### Análisis y Estadísticas

**Análisis de Carga**
- Gráfico de distribución de carga por día de la semana
- Detección de docentes con carga desequilibrada (mucho un día, poco otro)
- Análisis de uso de ambientes (% ocupación real vs. capacidad)
- Heatmap de ocupación de aulas por hora y día

**Reportes Personalizados**
- Constructor de reportes ad-hoc (el usuario elige qué campos incluir)
- Programación de reportes automáticos (enviar cada lunes a directores)
- Comparación entre períodos (semestre actual vs. anterior)
- Análisis de tendencias (evolución de carga docente en el tiempo)

### Gestión Docente

**Perfil Docente Ampliado**
- Historial de horarios por semestre
- Preferencias de horario (mañana/tarde, días específicos)
- Restricciones especiales (no puede dictar viernes, etc.)
- Evaluación de desempeño vinculado a horarios

**Comunicación con Docentes**
- Chat interno para coordinadores y docentes
- Sistema de tickets para solicitudes de cambios
- Notificaciones push (mobile) para cambios de horario
- Encuestas de satisfacción con el horario asignado

### Gestión de Estudiantes

**Vista Estudiantil**
- Horario por carrera/semestre (vista del estudiante)
- Detección de cruces de horarios para estudiantes
- Sugerencia de alternativas si hay cruce
- Exportación del horario del estudiante

### Integraciones con Calendarios

- Sincronización bidireccional con Google Calendar
- Sincronización con Outlook/Exchange
- Sincronización con Apple Calendar
- Webhooks para notificar cambios a sistemas externos

### Seguridad y Auditoría

**Seguridad Avanzada**
- 2FA (autenticación de dos factores)
- Logs de acceso detallados
- Alertas de actividad sospechosa
- Backup automático con versionado

**Auditoría Avanzada**
- Reporte de cambios por usuario
- Comparación de versiones (diff visual)
- Restauración de versiones anteriores
- Aprobación de cambios (workflow de aprobación)

### Móvil

**PWA (Progressive Web App)**
- Versión móvil optimizada
- Instalable en home screen
- Funciona offline
- Sincronización automática

### Funcionalidades Específicas UNT

**Normativa UNT**
- Validación automática contra Reglamento RCU 296-2008
- Alertas de incumplimiento normativo
- Reportes específicos para órganos de gobierno
- Formatos oficiales UNT predefinidos

**Gestión de Facultades**
- Jerarquía: Universidad → Facultad → Escuela → Departamento
- Coordinadores por nivel jerárquico
- Permisos escalonados por facultad
- Reportes consolidados por facultad

---

## Priorización de Funcionalidades Adicionales

### Alta Prioridad
1. Exportación iCalendar (.ics) - sincronización con calendarios personales
2. Mapa interactivo del campus - ubicación de aulas
3. Análisis de carga por día - equilibrio de horarios
4. Vista estudiantil - horarios por carrera/semestre
5. Notificaciones push - cambios de horario

### Media Prioridad
1. App móvil PWA - acceso offline
2. Chat interno - comunicación
3. Constructor de reportes ad-hoc - flexibilidad
4. Historial por semestre - seguimiento
5. Preferencias de horario - personalización

### Baja Prioridad (Nice to have)
1. QR codes - compartir fácil
2. Widget embebible - sitio web
3. 2FA - seguridad extra
4. Encuestas de satisfacción - feedback
5. Heatmap de ocupación - visualización avanzada