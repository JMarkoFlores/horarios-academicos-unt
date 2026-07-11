# Documentación Técnica — Sistema de Horarios Académicos UNT

| Campo | Valor |
|-------|-------|
| **Versión** | 1.0.0 |
| **Fecha** | 10 de julio de 2026 |
| **Autor** | Equipo de Desarrollo — Escuela de Ingeniería de Sistemas, UNT |
| **Estado** | Revisado |

---

## 1. Propósito de la documentación

Esta carpeta contiene la documentación técnica completa del **Sistema de Gestión de Horarios Académicos** de la Universidad Nacional de Trujillo. Está diseñada para servir como referencia tanto para el equipo de desarrollo como para stakeholders técnicos, y es compatible con su importación directa como páginas en **Jira** o **Confluence**.

Cada documento es independiente, pero se complementan entre sí mediante referencias cruzadas.

## 2. Estructura del repositorio

```
horarios-academicos-unt/
├── backend/                  # NestJS 10 + TypeORM + PostgreSQL
├── frontend/                 # Angular 17 + Angular Material
├── docker/                   # Dockerfiles alternativos
├── docker-compose.yml        # Infraestructura local
├── render.yaml               # Blueprint de despliegue en Render
├── .github/workflows/        # CI/CD (GitHub Actions)
├── docs/                     # ← Esta carpeta
│   ├── 00-README-documentacion.md
│   ├── 01-manual-instalacion.md
│   ├── 02-manual-usuario.md
│   ├── 03-diagrama-arquitectura.md
│   ├── 04-modelo-datos.md
│   ├── 05-diagrama-componentes.md
│   └── 06-diagramas-secuencia-estados.md
└── ...
```

## 3. Documentos y descripción

| # | Documento | Propósito | Audiencia |
|---|-----------|-----------|-----------|
| 00 | **Índice de documentación** (este archivo) | Página raíz con enlaces a todos los documentos | Todos |
| 01 | [Manual de Instalación](01-manual-instalacion.md) | Guía paso a paso para instalar, configurar y desplegar el sistema en local y producción | DevOps, Desarrolladores |
| 02 | [Manual de Usuario](02-manual-usuario.md) | Guía completa de uso del sistema por módulo y rol, con preguntas frecuentes | Usuarios finales, Administradores |
| 03 | [Diagrama de Arquitectura](03-diagrama-arquitectura.md) | Arquitectura de despliegue, componentes y flujos CI/CD en diagramas Mermaid | Arquitectos, Desarrolladores |
| 04 | [Modelo de Datos](04-modelo-datos.md) | Diagrama Entidad-Relación, especificación de entidades, enums y reglas de negocio | Desarrolladores, DBA |
| 05 | [Diagrama de Componentes](05-diagrama-componentes.md) | Módulos internos del sistema, dependencias y responsabilidades | Arquitectos, Desarrolladores |
| 06 | [Diagramas de Secuencia y Estados](06-diagramas-secuencia-estados.md) | Flujos de interacción y ciclos de vida de entidades clave | Desarrolladores, Analistas |

## 4. Estándares de documentación

- **Formato:** Markdown (compatible con Jira/Confluence)
- **Idioma:** Español neutro
- **Diagramas:** Sintaxis Mermaid (renderiza automáticamente en GitHub y Confluence)
- **Control de versiones:** Cada documento incluye tabla de metadatos e historial de cambios
- **Placeholders de capturas:** Formato `[SCREENSHOT: nombre-de-la-vista]` para que el usuario las reemplace

## 5. Stack tecnológico resumido

| Capa | Tecnología | Versión |
|------|------------|---------|
| Backend | NestJS | 10.x |
| ORM | TypeORM | 0.3.x |
| Base de datos | PostgreSQL | 16 |
| Cache / Colas | Redis + Bull | 7.x |
| Frontend | Angular | 17.x |
| UI Framework | Angular Material | 17.x |
| WebSocket | Socket.IO | 4.x |
| PDF | Puppeteer | 25.x |
| CI/CD | GitHub Actions | — |
| Despliegue Backend | Render (Docker) | — |
| Despliegue Frontend | Render (Docker) / Vercel (recomendado) | — |

## 6. Cómo mantener esta documentación

1. Al agregar un nuevo módulo o endpoint, actualizar los documentos correspondientes
2. Al cambiar variables de entorno, actualizar el Manual de Instalación
3. Al modificar el modelo de datos, actualizar el Diagrama de Datos
4. Al agregar un rol o permiso, actualizar el Manual de Usuario
5. Cada cambio debe registrarse en la tabla "Historial de cambios" del documento modificado

## 7. Historial de cambios

| Versión | Fecha | Autor | Descripción del cambio |
|---------|-------|-------|------------------------|
| 1.0.0 | 10/07/2026 | Equipo de Desarrollo | Versión inicial de toda la documentación técnica |
