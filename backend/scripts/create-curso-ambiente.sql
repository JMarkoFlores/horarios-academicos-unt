CREATE TABLE curso_ambiente (
  id SERIAL PRIMARY KEY,
  curso_id integer NOT NULL,
  ambiente_id integer NOT NULL,
  tipo_clase curso_ambiente_tipo_clase_enum NOT NULL DEFAULT 'TEORIA',
  CONSTRAINT UQ_curso_ambiente UNIQUE (curso_id, ambiente_id, tipo_clase)
);
