--
-- PostgreSQL database dump
--

\restrict 7jv6QZJZcgnEOJF4PtC3vMwjjnhFcrfB6zYlxz15fguGIS06r6subJBWsVkhPeg

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ambiente_tipo_enum; Type: TYPE; Schema: public; Owner: unt_user
--

CREATE TYPE public.ambiente_tipo_enum AS ENUM (
    'AULA',
    'LABORATORIO'
);


ALTER TYPE public.ambiente_tipo_enum OWNER TO unt_user;

--
-- Name: cola_docentes_estado_enum; Type: TYPE; Schema: public; Owner: unt_user
--

CREATE TYPE public.cola_docentes_estado_enum AS ENUM (
    'ESPERANDO',
    'EN_ATENCION',
    'COMPLETADO',
    'AUSENTE'
);


ALTER TYPE public.cola_docentes_estado_enum OWNER TO unt_user;

--
-- Name: docente_categoria_enum; Type: TYPE; Schema: public; Owner: unt_user
--

CREATE TYPE public.docente_categoria_enum AS ENUM (
    'PRINCIPAL',
    'ASOCIADO',
    'AUXILIAR',
    'JEFE_PRACTICA'
);


ALTER TYPE public.docente_categoria_enum OWNER TO unt_user;

--
-- Name: docente_tipo_contrato_enum; Type: TYPE; Schema: public; Owner: unt_user
--

CREATE TYPE public.docente_tipo_contrato_enum AS ENUM (
    'NOMBRADO',
    'CONTRATADO'
);


ALTER TYPE public.docente_tipo_contrato_enum OWNER TO unt_user;

--
-- Name: horario_asignado_estado_enum; Type: TYPE; Schema: public; Owner: unt_user
--

CREATE TYPE public.horario_asignado_estado_enum AS ENUM (
    'BORRADOR',
    'PUBLICADO',
    'CERRADO'
);


ALTER TYPE public.horario_asignado_estado_enum OWNER TO unt_user;

--
-- Name: horario_asignado_tipo_clase_enum; Type: TYPE; Schema: public; Owner: unt_user
--

CREATE TYPE public.horario_asignado_tipo_clase_enum AS ENUM (
    'TEORIA',
    'LABORATORIO'
);


ALTER TYPE public.horario_asignado_tipo_clase_enum OWNER TO unt_user;

--
-- Name: notificacion_docente_canal_enum; Type: TYPE; Schema: public; Owner: unt_user
--

CREATE TYPE public.notificacion_docente_canal_enum AS ENUM (
    'correo',
    'whatsapp',
    'telegram'
);


ALTER TYPE public.notificacion_docente_canal_enum OWNER TO unt_user;

--
-- Name: notificacion_docente_estado_enum; Type: TYPE; Schema: public; Owner: unt_user
--

CREATE TYPE public.notificacion_docente_estado_enum AS ENUM (
    'PENDIENTE',
    'ENVIADO',
    'FALLIDO'
);


ALTER TYPE public.notificacion_docente_estado_enum OWNER TO unt_user;

--
-- Name: preasignacion_tipo_clase_enum; Type: TYPE; Schema: public; Owner: unt_user
--

CREATE TYPE public.preasignacion_tipo_clase_enum AS ENUM (
    'TEORIA',
    'LABORATORIO'
);


ALTER TYPE public.preasignacion_tipo_clase_enum OWNER TO unt_user;

--
-- Name: usuario_rol_enum; Type: TYPE; Schema: public; Owner: unt_user
--

CREATE TYPE public.usuario_rol_enum AS ENUM (
    'ADMIN',
    'COORDINADOR',
    'OPERADOR'
);


ALTER TYPE public.usuario_rol_enum OWNER TO unt_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ambiente; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.ambiente (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    tipo public.ambiente_tipo_enum NOT NULL,
    capacidad integer NOT NULL,
    piso integer,
    pabellon character varying(50),
    equipamiento text,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.ambiente OWNER TO unt_user;

--
-- Name: ambiente_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.ambiente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ambiente_id_seq OWNER TO unt_user;

--
-- Name: ambiente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.ambiente_id_seq OWNED BY public.ambiente.id;


--
-- Name: cola_docentes; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.cola_docentes (
    id integer NOT NULL,
    orden integer NOT NULL,
    estado public.cola_docentes_estado_enum DEFAULT 'ESPERANDO'::public.cola_docentes_estado_enum NOT NULL,
    turno_llamado_at timestamp without time zone,
    ventana_id integer NOT NULL,
    docente_id integer NOT NULL
);


ALTER TABLE public.cola_docentes OWNER TO unt_user;

--
-- Name: cola_docentes_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.cola_docentes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cola_docentes_id_seq OWNER TO unt_user;

--
-- Name: cola_docentes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.cola_docentes_id_seq OWNED BY public.cola_docentes.id;


--
-- Name: conflicto_asignacion; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.conflicto_asignacion (
    id integer NOT NULL,
    descripcion text NOT NULL,
    tipo_conflicto character varying(100) NOT NULL,
    periodo_academico character varying(20) NOT NULL,
    resuelto boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    docente_id integer,
    ambiente_id integer
);


ALTER TABLE public.conflicto_asignacion OWNER TO unt_user;

--
-- Name: conflicto_asignacion_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.conflicto_asignacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conflicto_asignacion_id_seq OWNER TO unt_user;

--
-- Name: conflicto_asignacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.conflicto_asignacion_id_seq OWNED BY public.conflicto_asignacion.id;


--
-- Name: curso; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.curso (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(150) NOT NULL,
    creditos integer NOT NULL,
    horas_teoria integer NOT NULL,
    horas_laboratorio integer DEFAULT 0 NOT NULL,
    ciclo integer NOT NULL,
    tiene_laboratorio boolean DEFAULT false NOT NULL,
    prerequisitos text,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.curso OWNER TO unt_user;

--
-- Name: curso_ambiente; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.curso_ambiente (
    curso_id integer NOT NULL,
    ambiente_id integer NOT NULL
);


ALTER TABLE public.curso_ambiente OWNER TO unt_user;

--
-- Name: curso_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.curso_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.curso_id_seq OWNER TO unt_user;

--
-- Name: curso_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.curso_id_seq OWNED BY public.curso.id;


--
-- Name: dia_no_laborable; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.dia_no_laborable (
    id integer NOT NULL,
    fecha date NOT NULL,
    descripcion character varying(200) NOT NULL,
    tipo character varying(30) NOT NULL,
    afecta_aulas boolean DEFAULT true NOT NULL,
    afecta_laboratorios boolean DEFAULT true NOT NULL,
    periodo_academico character varying(20) NOT NULL
);


ALTER TABLE public.dia_no_laborable OWNER TO unt_user;

--
-- Name: dia_no_laborable_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.dia_no_laborable_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dia_no_laborable_id_seq OWNER TO unt_user;

--
-- Name: dia_no_laborable_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.dia_no_laborable_id_seq OWNED BY public.dia_no_laborable.id;


--
-- Name: disponibilidad_docente; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.disponibilidad_docente (
    id integer NOT NULL,
    dia_semana integer NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    disponible boolean DEFAULT true NOT NULL,
    periodo_academico character varying(20) NOT NULL,
    docente_id integer NOT NULL
);


ALTER TABLE public.disponibilidad_docente OWNER TO unt_user;

--
-- Name: disponibilidad_docente_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.disponibilidad_docente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.disponibilidad_docente_id_seq OWNER TO unt_user;

--
-- Name: disponibilidad_docente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.disponibilidad_docente_id_seq OWNED BY public.disponibilidad_docente.id;


--
-- Name: docente; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.docente (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombres character varying(150) NOT NULL,
    apellidos character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    telefono character varying(20),
    categoria public.docente_categoria_enum NOT NULL,
    tipo_contrato public.docente_tipo_contrato_enum NOT NULL,
    fecha_ingreso date NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.docente OWNER TO unt_user;

--
-- Name: docente_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.docente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.docente_id_seq OWNER TO unt_user;

--
-- Name: docente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.docente_id_seq OWNED BY public.docente.id;


--
-- Name: grupo; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.grupo (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    ciclo integer NOT NULL,
    cupo_maximo integer NOT NULL,
    periodo_academico_id integer NOT NULL,
    curso_id integer NOT NULL
);


ALTER TABLE public.grupo OWNER TO unt_user;

--
-- Name: grupo_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.grupo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grupo_id_seq OWNER TO unt_user;

--
-- Name: grupo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.grupo_id_seq OWNED BY public.grupo.id;


--
-- Name: horario_asignado; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.horario_asignado (
    id integer NOT NULL,
    tipo_clase public.horario_asignado_tipo_clase_enum NOT NULL,
    dia_semana integer NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    periodo_academico character varying(20) NOT NULL,
    estado public.horario_asignado_estado_enum DEFAULT 'BORRADOR'::public.horario_asignado_estado_enum NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    docente_id integer NOT NULL,
    curso_id integer NOT NULL,
    grupo_id integer,
    ambiente_id integer NOT NULL
);


ALTER TABLE public.horario_asignado OWNER TO unt_user;

--
-- Name: horario_asignado_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.horario_asignado_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.horario_asignado_id_seq OWNER TO unt_user;

--
-- Name: horario_asignado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.horario_asignado_id_seq OWNED BY public.horario_asignado.id;


--
-- Name: notificacion_docente; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.notificacion_docente (
    id integer NOT NULL,
    tipo character varying(100) NOT NULL,
    mensaje text NOT NULL,
    canal public.notificacion_docente_canal_enum NOT NULL,
    estado public.notificacion_docente_estado_enum DEFAULT 'PENDIENTE'::public.notificacion_docente_estado_enum NOT NULL,
    enviado_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    docente_id integer NOT NULL
);


ALTER TABLE public.notificacion_docente OWNER TO unt_user;

--
-- Name: notificacion_docente_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.notificacion_docente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notificacion_docente_id_seq OWNER TO unt_user;

--
-- Name: notificacion_docente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.notificacion_docente_id_seq OWNED BY public.notificacion_docente.id;


--
-- Name: periodo_academico; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.periodo_academico (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    activo boolean DEFAULT false NOT NULL
);


ALTER TABLE public.periodo_academico OWNER TO unt_user;

--
-- Name: periodo_academico_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.periodo_academico_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.periodo_academico_id_seq OWNER TO unt_user;

--
-- Name: periodo_academico_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.periodo_academico_id_seq OWNED BY public.periodo_academico.id;


--
-- Name: preasignacion; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.preasignacion (
    id integer NOT NULL,
    tipo_clase public.preasignacion_tipo_clase_enum NOT NULL,
    dia_semana integer NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    periodo_academico character varying(20) NOT NULL,
    docente_id integer NOT NULL,
    curso_id integer NOT NULL,
    ambiente_id integer
);


ALTER TABLE public.preasignacion OWNER TO unt_user;

--
-- Name: preasignacion_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.preasignacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.preasignacion_id_seq OWNER TO unt_user;

--
-- Name: preasignacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.preasignacion_id_seq OWNED BY public.preasignacion.id;


--
-- Name: preferencias_notificacion; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.preferencias_notificacion (
    id integer NOT NULL,
    canal_correo boolean DEFAULT true NOT NULL,
    canal_whatsapp boolean DEFAULT false NOT NULL,
    telefono character varying(20),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    docente_id integer NOT NULL
);


ALTER TABLE public.preferencias_notificacion OWNER TO unt_user;

--
-- Name: preferencias_notificacion_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.preferencias_notificacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.preferencias_notificacion_id_seq OWNER TO unt_user;

--
-- Name: preferencias_notificacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.preferencias_notificacion_id_seq OWNED BY public.preferencias_notificacion.id;


--
-- Name: restriccion_institucional; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.restriccion_institucional (
    id integer NOT NULL,
    tipo_restriccion character varying(100) NOT NULL,
    valor jsonb NOT NULL,
    periodo_academico character varying(20) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.restriccion_institucional OWNER TO unt_user;

--
-- Name: restriccion_institucional_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.restriccion_institucional_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.restriccion_institucional_id_seq OWNER TO unt_user;

--
-- Name: restriccion_institucional_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.restriccion_institucional_id_seq OWNED BY public.restriccion_institucional.id;


--
-- Name: seleccion_temporal; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.seleccion_temporal (
    id integer NOT NULL,
    dia_semana integer NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    expira_at timestamp without time zone NOT NULL,
    docente_id integer NOT NULL,
    ambiente_id integer NOT NULL
);


ALTER TABLE public.seleccion_temporal OWNER TO unt_user;

--
-- Name: seleccion_temporal_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.seleccion_temporal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seleccion_temporal_id_seq OWNER TO unt_user;

--
-- Name: seleccion_temporal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.seleccion_temporal_id_seq OWNED BY public.seleccion_temporal.id;


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.usuario (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol public.usuario_rol_enum DEFAULT 'OPERADOR'::public.usuario_rol_enum NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.usuario OWNER TO unt_user;

--
-- Name: usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.usuario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_id_seq OWNER TO unt_user;

--
-- Name: usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.usuario_id_seq OWNED BY public.usuario.id;


--
-- Name: ventana_atencion; Type: TABLE; Schema: public; Owner: unt_user
--

CREATE TABLE public.ventana_atencion (
    id integer NOT NULL,
    periodo_academico character varying(20) NOT NULL,
    fecha date NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.ventana_atencion OWNER TO unt_user;

--
-- Name: ventana_atencion_id_seq; Type: SEQUENCE; Schema: public; Owner: unt_user
--

CREATE SEQUENCE public.ventana_atencion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ventana_atencion_id_seq OWNER TO unt_user;

--
-- Name: ventana_atencion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: unt_user
--

ALTER SEQUENCE public.ventana_atencion_id_seq OWNED BY public.ventana_atencion.id;


--
-- Name: ambiente id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.ambiente ALTER COLUMN id SET DEFAULT nextval('public.ambiente_id_seq'::regclass);


--
-- Name: cola_docentes id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.cola_docentes ALTER COLUMN id SET DEFAULT nextval('public.cola_docentes_id_seq'::regclass);


--
-- Name: conflicto_asignacion id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.conflicto_asignacion ALTER COLUMN id SET DEFAULT nextval('public.conflicto_asignacion_id_seq'::regclass);


--
-- Name: curso id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.curso ALTER COLUMN id SET DEFAULT nextval('public.curso_id_seq'::regclass);


--
-- Name: dia_no_laborable id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.dia_no_laborable ALTER COLUMN id SET DEFAULT nextval('public.dia_no_laborable_id_seq'::regclass);


--
-- Name: disponibilidad_docente id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.disponibilidad_docente ALTER COLUMN id SET DEFAULT nextval('public.disponibilidad_docente_id_seq'::regclass);


--
-- Name: docente id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.docente ALTER COLUMN id SET DEFAULT nextval('public.docente_id_seq'::regclass);


--
-- Name: grupo id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.grupo ALTER COLUMN id SET DEFAULT nextval('public.grupo_id_seq'::regclass);


--
-- Name: horario_asignado id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.horario_asignado ALTER COLUMN id SET DEFAULT nextval('public.horario_asignado_id_seq'::regclass);


--
-- Name: notificacion_docente id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.notificacion_docente ALTER COLUMN id SET DEFAULT nextval('public.notificacion_docente_id_seq'::regclass);


--
-- Name: periodo_academico id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.periodo_academico ALTER COLUMN id SET DEFAULT nextval('public.periodo_academico_id_seq'::regclass);


--
-- Name: preasignacion id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.preasignacion ALTER COLUMN id SET DEFAULT nextval('public.preasignacion_id_seq'::regclass);


--
-- Name: preferencias_notificacion id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.preferencias_notificacion ALTER COLUMN id SET DEFAULT nextval('public.preferencias_notificacion_id_seq'::regclass);


--
-- Name: restriccion_institucional id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.restriccion_institucional ALTER COLUMN id SET DEFAULT nextval('public.restriccion_institucional_id_seq'::regclass);


--
-- Name: seleccion_temporal id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.seleccion_temporal ALTER COLUMN id SET DEFAULT nextval('public.seleccion_temporal_id_seq'::regclass);


--
-- Name: usuario id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id SET DEFAULT nextval('public.usuario_id_seq'::regclass);


--
-- Name: ventana_atencion id; Type: DEFAULT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.ventana_atencion ALTER COLUMN id SET DEFAULT nextval('public.ventana_atencion_id_seq'::regclass);


--
-- Data for Name: ambiente; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.ambiente (id, codigo, nombre, tipo, capacidad, piso, pabellon, equipamiento, activo) FROM stdin;
46	A-j839-1	Ambiente 1	AULA	21	\N	\N	\N	t
47	A-j839-2	Ambiente 2	AULA	22	\N	\N	\N	t
48	A-101	Aula A-101	AULA	35	1	A	\N	t
49	A-102	Aula A-102	AULA	35	1	A	\N	t
50	A-201	Aula A-201	AULA	40	2	A	\N	t
51	A-202	Aula A-202	AULA	40	2	A	\N	t
52	LAB-1	Laboratorio 1	LABORATORIO	30	1	B	30 PCs	t
53	LAB-2	Laboratorio 2	LABORATORIO	30	1	B	30 PCs	t
\.


--
-- Data for Name: cola_docentes; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.cola_docentes (id, orden, estado, turno_llamado_at, ventana_id, docente_id) FROM stdin;
\.


--
-- Data for Name: conflicto_asignacion; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.conflicto_asignacion (id, descripcion, tipo_conflicto, periodo_academico, resuelto, created_at, docente_id, ambiente_id) FROM stdin;
1	Curso "Curso Test 3": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	152	\N
2	Curso "Curso Test 6": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	152	\N
3	Curso "Curso Test 9": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	152	\N
4	Curso "Curso Test 12": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	152	\N
5	Curso "Curso Test 15": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	152	\N
6	Curso "Curso Test 18": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	152	\N
7	Curso "Curso Test 21": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	144	\N
8	Curso "Curso Test 24": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	144	\N
9	Curso "Curso Test 27": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	144	\N
10	Curso "Curso Test 30": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	144	\N
11	Curso "Curso Test 33": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	144	\N
12	Curso "Curso Test 36": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	144	\N
13	Curso "Curso Test 39": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	144	\N
14	Curso "Curso Test 42": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	148	\N
15	Curso "Curso Test 45": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	148	\N
16	Curso "Curso Test 48": sin slot para laboratorio	SIN_SLOT_LABORATORIO	P-biazy	f	2026-05-16 13:42:19.350017	148	\N
\.


--
-- Data for Name: curso; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.curso (id, codigo, nombre, creditos, horas_teoria, horas_laboratorio, ciclo, tiene_laboratorio, prerequisitos, activo) FROM stdin;
471	CS101	Programaci├│n I	4	4	2	1	t	\N	t
472	CS102	Programaci├│n II	4	4	2	2	t	\N	t
473	CS201	Estructuras de Datos	4	3	2	3	t	\N	t
474	CS301	Base de Datos I	4	3	2	4	t	\N	t
475	CS202	Algoritmos	4	4	0	3	f	\N	t
476	CS401	Redes	4	3	2	5	t	\N	t
477	CS302	Sistemas Operativos	4	4	2	4	t	\N	t
478	CS501	Ingenier├¡a de Software	4	4	0	6	f	\N	t
421	C-61pp-1	Curso Test 1	2	2	0	2	f	\N	t
422	C-61pp-2	Curso Test 2	3	2	0	3	f	\N	t
423	C-61pp-3	Curso Test 3	4	2	2	4	t	\N	t
424	C-61pp-4	Curso Test 4	1	2	0	5	f	\N	t
425	C-61pp-5	Curso Test 5	2	2	0	6	f	\N	t
426	C-61pp-6	Curso Test 6	3	2	2	7	t	\N	t
427	C-61pp-7	Curso Test 7	4	2	0	8	f	\N	t
428	C-61pp-8	Curso Test 8	1	2	0	9	f	\N	t
429	C-61pp-9	Curso Test 9	2	2	2	10	t	\N	t
430	C-61pp-10	Curso Test 10	3	2	0	1	f	\N	t
431	C-61pp-11	Curso Test 11	4	2	0	2	f	\N	t
432	C-61pp-12	Curso Test 12	1	2	2	3	t	\N	t
433	C-61pp-13	Curso Test 13	2	2	0	4	f	\N	t
434	C-61pp-14	Curso Test 14	3	2	0	5	f	\N	t
435	C-61pp-15	Curso Test 15	4	2	2	6	t	\N	t
436	C-61pp-16	Curso Test 16	1	2	0	7	f	\N	t
437	C-61pp-17	Curso Test 17	2	2	0	8	f	\N	t
438	C-61pp-18	Curso Test 18	3	2	2	9	t	\N	t
439	C-61pp-19	Curso Test 19	4	2	0	10	f	\N	t
440	C-61pp-20	Curso Test 20	1	2	0	1	f	\N	t
441	C-61pp-21	Curso Test 21	2	2	2	2	t	\N	t
442	C-61pp-22	Curso Test 22	3	2	0	3	f	\N	t
443	C-61pp-23	Curso Test 23	4	2	0	4	f	\N	t
444	C-61pp-24	Curso Test 24	1	2	2	5	t	\N	t
445	C-61pp-25	Curso Test 25	2	2	0	6	f	\N	t
446	C-61pp-26	Curso Test 26	3	2	0	7	f	\N	t
447	C-61pp-27	Curso Test 27	4	2	2	8	t	\N	t
448	C-61pp-28	Curso Test 28	1	2	0	9	f	\N	t
449	C-61pp-29	Curso Test 29	2	2	0	10	f	\N	t
450	C-61pp-30	Curso Test 30	3	2	2	1	t	\N	t
451	C-61pp-31	Curso Test 31	4	2	0	2	f	\N	t
452	C-61pp-32	Curso Test 32	1	2	0	3	f	\N	t
453	C-61pp-33	Curso Test 33	2	2	2	4	t	\N	t
454	C-61pp-34	Curso Test 34	3	2	0	5	f	\N	t
455	C-61pp-35	Curso Test 35	4	2	0	6	f	\N	t
456	C-61pp-36	Curso Test 36	1	2	2	7	t	\N	t
457	C-61pp-37	Curso Test 37	2	2	0	8	f	\N	t
458	C-61pp-38	Curso Test 38	3	2	0	9	f	\N	t
459	C-61pp-39	Curso Test 39	4	2	2	10	t	\N	t
460	C-61pp-40	Curso Test 40	1	2	0	1	f	\N	t
461	C-61pp-41	Curso Test 41	2	2	0	2	f	\N	t
462	C-61pp-42	Curso Test 42	3	2	2	3	t	\N	t
463	C-61pp-43	Curso Test 43	4	2	0	4	f	\N	t
464	C-61pp-44	Curso Test 44	1	2	0	5	f	\N	t
465	C-61pp-45	Curso Test 45	2	2	2	6	t	\N	t
466	C-61pp-46	Curso Test 46	3	2	0	7	f	\N	t
467	C-61pp-47	Curso Test 47	4	2	0	8	f	\N	t
468	C-61pp-48	Curso Test 48	1	2	2	9	t	\N	t
469	C-61pp-49	Curso Test 49	2	2	0	10	f	\N	t
470	C-61pp-50	Curso Test 50	3	2	0	1	f	\N	t
\.


--
-- Data for Name: curso_ambiente; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.curso_ambiente (curso_id, ambiente_id) FROM stdin;
\.


--
-- Data for Name: dia_no_laborable; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.dia_no_laborable (id, fecha, descripcion, tipo, afecta_aulas, afecta_laboratorios, periodo_academico) FROM stdin;
\.


--
-- Data for Name: disponibilidad_docente; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.disponibilidad_docente (id, dia_semana, hora_inicio, hora_fin, disponible, periodo_academico, docente_id) FROM stdin;
701	1	08:00:00	18:00:00	t	P-biazy	141
702	2	08:00:00	18:00:00	t	P-biazy	141
703	3	08:00:00	18:00:00	t	P-biazy	141
704	4	08:00:00	18:00:00	t	P-biazy	141
705	5	08:00:00	18:00:00	t	P-biazy	141
706	1	08:00:00	18:00:00	t	P-biazy	142
707	2	08:00:00	18:00:00	t	P-biazy	142
708	3	08:00:00	18:00:00	t	P-biazy	142
709	4	08:00:00	18:00:00	t	P-biazy	142
710	5	08:00:00	18:00:00	t	P-biazy	142
711	1	08:00:00	18:00:00	t	P-biazy	143
712	2	08:00:00	18:00:00	t	P-biazy	143
713	3	08:00:00	18:00:00	t	P-biazy	143
714	4	08:00:00	18:00:00	t	P-biazy	143
715	5	08:00:00	18:00:00	t	P-biazy	143
716	1	08:00:00	18:00:00	t	P-biazy	144
717	2	08:00:00	18:00:00	t	P-biazy	144
718	3	08:00:00	18:00:00	t	P-biazy	144
719	4	08:00:00	18:00:00	t	P-biazy	144
720	5	08:00:00	18:00:00	t	P-biazy	144
721	1	08:00:00	18:00:00	t	P-biazy	145
722	2	08:00:00	18:00:00	t	P-biazy	145
723	3	08:00:00	18:00:00	t	P-biazy	145
724	4	08:00:00	18:00:00	t	P-biazy	145
725	5	08:00:00	18:00:00	t	P-biazy	145
726	1	08:00:00	18:00:00	t	P-biazy	146
727	2	08:00:00	18:00:00	t	P-biazy	146
728	3	08:00:00	18:00:00	t	P-biazy	146
729	4	08:00:00	18:00:00	t	P-biazy	146
730	5	08:00:00	18:00:00	t	P-biazy	146
731	1	08:00:00	18:00:00	t	P-biazy	147
732	2	08:00:00	18:00:00	t	P-biazy	147
733	3	08:00:00	18:00:00	t	P-biazy	147
734	4	08:00:00	18:00:00	t	P-biazy	147
735	5	08:00:00	18:00:00	t	P-biazy	147
736	1	08:00:00	18:00:00	t	P-biazy	148
737	2	08:00:00	18:00:00	t	P-biazy	148
738	3	08:00:00	18:00:00	t	P-biazy	148
739	4	08:00:00	18:00:00	t	P-biazy	148
740	5	08:00:00	18:00:00	t	P-biazy	148
741	1	08:00:00	18:00:00	t	P-biazy	149
742	2	08:00:00	18:00:00	t	P-biazy	149
743	3	08:00:00	18:00:00	t	P-biazy	149
744	4	08:00:00	18:00:00	t	P-biazy	149
745	5	08:00:00	18:00:00	t	P-biazy	149
746	1	08:00:00	18:00:00	t	P-biazy	150
747	2	08:00:00	18:00:00	t	P-biazy	150
748	3	08:00:00	18:00:00	t	P-biazy	150
749	4	08:00:00	18:00:00	t	P-biazy	150
750	5	08:00:00	18:00:00	t	P-biazy	150
751	1	08:00:00	18:00:00	t	P-biazy	151
752	2	08:00:00	18:00:00	t	P-biazy	151
753	3	08:00:00	18:00:00	t	P-biazy	151
754	4	08:00:00	18:00:00	t	P-biazy	151
755	5	08:00:00	18:00:00	t	P-biazy	151
756	1	08:00:00	18:00:00	t	P-biazy	152
757	2	08:00:00	18:00:00	t	P-biazy	152
758	3	08:00:00	18:00:00	t	P-biazy	152
759	4	08:00:00	18:00:00	t	P-biazy	152
760	5	08:00:00	18:00:00	t	P-biazy	152
761	1	08:00:00	18:00:00	t	P-biazy	153
762	2	08:00:00	18:00:00	t	P-biazy	153
763	3	08:00:00	18:00:00	t	P-biazy	153
764	4	08:00:00	18:00:00	t	P-biazy	153
765	5	08:00:00	18:00:00	t	P-biazy	153
766	1	08:00:00	18:00:00	t	P-biazy	154
767	2	08:00:00	18:00:00	t	P-biazy	154
768	3	08:00:00	18:00:00	t	P-biazy	154
769	4	08:00:00	18:00:00	t	P-biazy	154
770	5	08:00:00	18:00:00	t	P-biazy	154
771	1	08:00:00	18:00:00	t	P-biazy	155
772	2	08:00:00	18:00:00	t	P-biazy	155
773	3	08:00:00	18:00:00	t	P-biazy	155
774	4	08:00:00	18:00:00	t	P-biazy	155
775	5	08:00:00	18:00:00	t	P-biazy	155
776	1	08:00:00	18:00:00	t	P-biazy	156
777	2	08:00:00	18:00:00	t	P-biazy	156
778	3	08:00:00	18:00:00	t	P-biazy	156
779	4	08:00:00	18:00:00	t	P-biazy	156
780	5	08:00:00	18:00:00	t	P-biazy	156
781	1	08:00:00	18:00:00	t	P-biazy	157
782	2	08:00:00	18:00:00	t	P-biazy	157
783	3	08:00:00	18:00:00	t	P-biazy	157
784	4	08:00:00	18:00:00	t	P-biazy	157
785	5	08:00:00	18:00:00	t	P-biazy	157
786	1	08:00:00	18:00:00	t	P-biazy	158
787	2	08:00:00	18:00:00	t	P-biazy	158
788	3	08:00:00	18:00:00	t	P-biazy	158
789	4	08:00:00	18:00:00	t	P-biazy	158
790	5	08:00:00	18:00:00	t	P-biazy	158
791	1	08:00:00	18:00:00	t	P-biazy	159
792	2	08:00:00	18:00:00	t	P-biazy	159
793	3	08:00:00	18:00:00	t	P-biazy	159
794	4	08:00:00	18:00:00	t	P-biazy	159
795	5	08:00:00	18:00:00	t	P-biazy	159
796	1	08:00:00	18:00:00	t	P-biazy	160
797	2	08:00:00	18:00:00	t	P-biazy	160
798	3	08:00:00	18:00:00	t	P-biazy	160
799	4	08:00:00	18:00:00	t	P-biazy	160
800	5	08:00:00	18:00:00	t	P-biazy	160
\.


--
-- Data for Name: docente; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.docente (id, codigo, nombres, apellidos, email, telefono, categoria, tipo_contrato, fecha_ingreso, activo, created_at, updated_at) FROM stdin;
161	DOC001	Juan Carlos	P├®rez Rodr├¡guez	jperez@unt.edu.pe	\N	PRINCIPAL	NOMBRADO	2000-02-29	t	2026-05-16 16:51:04.850464	2026-05-16 16:51:04.850464
162	DOC002	Mar├¡a Elena	Garc├¡a S├ínchez	mgarcia@unt.edu.pe	\N	ASOCIADO	NOMBRADO	2005-06-14	t	2026-05-16 16:51:04.855582	2026-05-16 16:51:04.855582
163	DOC003	Carlos Alberto	L├│pez Flores	clopez@unt.edu.pe	\N	AUXILIAR	NOMBRADO	2010-08-31	t	2026-05-16 16:51:04.857507	2026-05-16 16:51:04.857507
164	DOC004	Ana Patricia	Torres Vega	atorres@unt.edu.pe	\N	JEFE_PRACTICA	NOMBRADO	2015-02-28	t	2026-05-16 16:51:04.859109	2026-05-16 16:51:04.859109
165	DOC005	Pedro Manuel	Ruiz Castillo	pruiz@unt.edu.pe	\N	PRINCIPAL	NOMBRADO	1998-01-09	t	2026-05-16 16:51:04.860306	2026-05-16 16:51:04.860306
166	DOC006	Luis Fernando	Vargas Mendoza	lvargas@unt.edu.pe	\N	PRINCIPAL	CONTRATADO	2020-02-29	t	2026-05-16 16:51:04.861367	2026-05-16 16:51:04.861367
167	DOC007	Rosa Amelia	Mendoza Torres	rmendoza@unt.edu.pe	\N	ASOCIADO	CONTRATADO	2021-02-28	t	2026-05-16 16:51:04.862495	2026-05-16 16:51:04.862495
168	DOC008	Jorge Luis	Silva Paredes	jsilva@unt.edu.pe	\N	AUXILIAR	CONTRATADO	2022-02-28	t	2026-05-16 16:51:04.863861	2026-05-16 16:51:04.863861
141	D-2lf6-1	Docente Test 1	Apellido 1	doc2lf61@test.com	\N	ASOCIADO	CONTRATADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
142	D-2lf6-2	Docente Test 2	Apellido 2	doc2lf62@test.com	\N	AUXILIAR	NOMBRADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
143	D-2lf6-3	Docente Test 3	Apellido 3	doc2lf63@test.com	\N	JEFE_PRACTICA	CONTRATADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
144	D-2lf6-4	Docente Test 4	Apellido 4	doc2lf64@test.com	\N	PRINCIPAL	NOMBRADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
145	D-2lf6-5	Docente Test 5	Apellido 5	doc2lf65@test.com	\N	ASOCIADO	CONTRATADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
146	D-2lf6-6	Docente Test 6	Apellido 6	doc2lf66@test.com	\N	AUXILIAR	NOMBRADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
147	D-2lf6-7	Docente Test 7	Apellido 7	doc2lf67@test.com	\N	JEFE_PRACTICA	CONTRATADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
148	D-2lf6-8	Docente Test 8	Apellido 8	doc2lf68@test.com	\N	PRINCIPAL	NOMBRADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
149	D-2lf6-9	Docente Test 9	Apellido 9	doc2lf69@test.com	\N	ASOCIADO	CONTRATADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
150	D-2lf6-10	Docente Test 10	Apellido 10	doc2lf610@test.com	\N	AUXILIAR	NOMBRADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
151	D-2lf6-11	Docente Test 11	Apellido 11	doc2lf611@test.com	\N	JEFE_PRACTICA	CONTRATADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
152	D-2lf6-12	Docente Test 12	Apellido 12	doc2lf612@test.com	\N	PRINCIPAL	NOMBRADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
153	D-2lf6-13	Docente Test 13	Apellido 13	doc2lf613@test.com	\N	ASOCIADO	CONTRATADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
154	D-2lf6-14	Docente Test 14	Apellido 14	doc2lf614@test.com	\N	AUXILIAR	NOMBRADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
155	D-2lf6-15	Docente Test 15	Apellido 15	doc2lf615@test.com	\N	JEFE_PRACTICA	CONTRATADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
156	D-2lf6-16	Docente Test 16	Apellido 16	doc2lf616@test.com	\N	PRINCIPAL	NOMBRADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
157	D-2lf6-17	Docente Test 17	Apellido 17	doc2lf617@test.com	\N	ASOCIADO	CONTRATADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
158	D-2lf6-18	Docente Test 18	Apellido 18	doc2lf618@test.com	\N	AUXILIAR	NOMBRADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
159	D-2lf6-19	Docente Test 19	Apellido 19	doc2lf619@test.com	\N	JEFE_PRACTICA	CONTRATADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
160	D-2lf6-20	Docente Test 20	Apellido 20	doc2lf620@test.com	\N	PRINCIPAL	NOMBRADO	2019-12-31	t	2026-05-16 13:42:19.338512	2026-05-16 13:42:19.338512
\.


--
-- Data for Name: grupo; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.grupo (id, codigo, nombre, ciclo, cupo_maximo, periodo_academico_id, curso_id) FROM stdin;
\.


--
-- Data for Name: horario_asignado; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.horario_asignado (id, tipo_clase, dia_semana, hora_inicio, hora_fin, periodo_academico, estado, created_at, updated_at, docente_id, curso_id, grupo_id, ambiente_id) FROM stdin;
560	TEORIA	1	08:00:00	09:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	421	\N	46
561	TEORIA	1	09:00:00	10:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	422	\N	46
562	TEORIA	1	10:00:00	11:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	423	\N	46
563	TEORIA	1	11:00:00	12:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	424	\N	46
564	TEORIA	1	12:00:00	13:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	425	\N	46
565	TEORIA	1	13:00:00	14:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	426	\N	46
566	TEORIA	1	14:00:00	15:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	427	\N	46
567	TEORIA	1	15:00:00	16:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	428	\N	46
568	TEORIA	1	16:00:00	17:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	429	\N	46
569	TEORIA	1	17:00:00	18:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	430	\N	46
570	TEORIA	2	08:00:00	09:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	431	\N	46
571	TEORIA	2	09:00:00	10:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	432	\N	46
572	TEORIA	2	10:00:00	11:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	433	\N	46
573	TEORIA	2	11:00:00	12:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	434	\N	46
574	TEORIA	2	12:00:00	13:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	435	\N	46
575	TEORIA	2	13:00:00	14:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	436	\N	46
576	TEORIA	2	14:00:00	15:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	437	\N	46
577	TEORIA	2	15:00:00	16:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	438	\N	46
578	TEORIA	2	16:00:00	17:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	439	\N	46
579	TEORIA	2	17:00:00	18:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	152	440	\N	46
580	TEORIA	1	08:00:00	09:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	441	\N	47
581	TEORIA	1	09:00:00	10:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	442	\N	47
582	TEORIA	1	10:00:00	11:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	443	\N	47
583	TEORIA	1	11:00:00	12:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	444	\N	47
584	TEORIA	1	12:00:00	13:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	445	\N	47
585	TEORIA	1	13:00:00	14:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	446	\N	47
586	TEORIA	1	14:00:00	15:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	447	\N	47
587	TEORIA	1	15:00:00	16:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	448	\N	47
588	TEORIA	1	16:00:00	17:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	449	\N	47
589	TEORIA	1	17:00:00	18:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	450	\N	47
590	TEORIA	2	08:00:00	09:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	451	\N	47
591	TEORIA	2	09:00:00	10:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	452	\N	47
592	TEORIA	2	10:00:00	11:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	453	\N	47
593	TEORIA	2	11:00:00	12:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	454	\N	47
594	TEORIA	2	12:00:00	13:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	455	\N	47
595	TEORIA	2	13:00:00	14:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	456	\N	47
596	TEORIA	2	14:00:00	15:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	457	\N	47
597	TEORIA	2	15:00:00	16:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	458	\N	47
598	TEORIA	2	16:00:00	17:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	459	\N	47
599	TEORIA	2	17:00:00	18:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	144	460	\N	47
600	TEORIA	3	08:00:00	09:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	148	461	\N	46
601	TEORIA	3	09:00:00	10:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	148	462	\N	46
602	TEORIA	3	10:00:00	11:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	148	463	\N	46
603	TEORIA	3	11:00:00	12:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	148	464	\N	46
604	TEORIA	3	12:00:00	13:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	148	465	\N	46
605	TEORIA	3	13:00:00	14:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	148	466	\N	46
606	TEORIA	3	14:00:00	15:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	148	467	\N	46
607	TEORIA	3	15:00:00	16:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	148	468	\N	46
608	TEORIA	3	16:00:00	17:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	148	469	\N	46
609	TEORIA	3	17:00:00	18:00:00	P-biazy	BORRADOR	2026-05-16 13:42:19.350017	2026-05-16 13:42:19.350017	148	470	\N	46
\.


--
-- Data for Name: notificacion_docente; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.notificacion_docente (id, tipo, mensaje, canal, estado, enviado_at, created_at, docente_id) FROM stdin;
\.


--
-- Data for Name: periodo_academico; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.periodo_academico (id, codigo, nombre, fecha_inicio, fecha_fin, activo) FROM stdin;
4	P-biazy	P-biazy	2026-02-28	2026-07-30	t
5	2026-I	Semestre 2026-I	2026-03-15	2026-07-30	t
\.


--
-- Data for Name: preasignacion; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.preasignacion (id, tipo_clase, dia_semana, hora_inicio, hora_fin, periodo_academico, docente_id, curso_id, ambiente_id) FROM stdin;
\.


--
-- Data for Name: preferencias_notificacion; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.preferencias_notificacion (id, canal_correo, canal_whatsapp, telefono, created_at, updated_at, docente_id) FROM stdin;
\.


--
-- Data for Name: restriccion_institucional; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.restriccion_institucional (id, tipo_restriccion, valor, periodo_academico, activo) FROM stdin;
\.


--
-- Data for Name: seleccion_temporal; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.seleccion_temporal (id, dia_semana, hora_inicio, hora_fin, expira_at, docente_id, ambiente_id) FROM stdin;
\.


--
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.usuario (id, nombre, email, password_hash, rol, activo, created_at, updated_at) FROM stdin;
1	Administrador del Sistema	admin@unt.edu.pe	$2b$10$F0luljV7VjVceyc76HE29OLpcWv.Mk/fTGTh1mUjkgWHgsf8ETdp6	ADMIN	t	2026-05-16 16:51:04.825109	2026-05-16 16:51:04.825109
2	Administrador del Sistema	admin@unitru.edu.pe	$2b$10$8AXlh3yh6/AMPLNv8bntd.6T2Tx2ZvwFeiCz9MM6b9QaxHUeyx7da	ADMIN	t	2026-05-16 18:08:16.348872	2026-05-16 18:08:16.348872
\.


--
-- Data for Name: ventana_atencion; Type: TABLE DATA; Schema: public; Owner: unt_user
--

COPY public.ventana_atencion (id, periodo_academico, fecha, hora_inicio, hora_fin, activo) FROM stdin;
\.


--
-- Name: ambiente_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.ambiente_id_seq', 53, true);


--
-- Name: cola_docentes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.cola_docentes_id_seq', 1, false);


--
-- Name: conflicto_asignacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.conflicto_asignacion_id_seq', 16, true);


--
-- Name: curso_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.curso_id_seq', 478, true);


--
-- Name: dia_no_laborable_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.dia_no_laborable_id_seq', 1, false);


--
-- Name: disponibilidad_docente_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.disponibilidad_docente_id_seq', 800, true);


--
-- Name: docente_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.docente_id_seq', 168, true);


--
-- Name: grupo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.grupo_id_seq', 1, false);


--
-- Name: horario_asignado_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.horario_asignado_id_seq', 609, true);


--
-- Name: notificacion_docente_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.notificacion_docente_id_seq', 1, false);


--
-- Name: periodo_academico_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.periodo_academico_id_seq', 5, true);


--
-- Name: preasignacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.preasignacion_id_seq', 1, false);


--
-- Name: preferencias_notificacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.preferencias_notificacion_id_seq', 1, false);


--
-- Name: restriccion_institucional_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.restriccion_institucional_id_seq', 1, false);


--
-- Name: seleccion_temporal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.seleccion_temporal_id_seq', 1, false);


--
-- Name: usuario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.usuario_id_seq', 2, true);


--
-- Name: ventana_atencion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: unt_user
--

SELECT pg_catalog.setval('public.ventana_atencion_id_seq', 1, false);


--
-- Name: periodo_academico PK_03dfbed29918daed662c13d3946; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.periodo_academico
    ADD CONSTRAINT "PK_03dfbed29918daed662c13d3946" PRIMARY KEY (id);


--
-- Name: disponibilidad_docente PK_0d2dcb32a12501dabbffc731915; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.disponibilidad_docente
    ADD CONSTRAINT "PK_0d2dcb32a12501dabbffc731915" PRIMARY KEY (id);


--
-- Name: restriccion_institucional PK_303d2588136d72e5cc7954b4278; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.restriccion_institucional
    ADD CONSTRAINT "PK_303d2588136d72e5cc7954b4278" PRIMARY KEY (id);


--
-- Name: preferencias_notificacion PK_33b64ac87f77bcbf629d881978c; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.preferencias_notificacion
    ADD CONSTRAINT "PK_33b64ac87f77bcbf629d881978c" PRIMARY KEY (id);


--
-- Name: dia_no_laborable PK_5326f5bb91c12a1c8cd047b5be5; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.dia_no_laborable
    ADD CONSTRAINT "PK_5326f5bb91c12a1c8cd047b5be5" PRIMARY KEY (id);


--
-- Name: ambiente PK_563de0476b276e437c20af12348; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.ambiente
    ADD CONSTRAINT "PK_563de0476b276e437c20af12348" PRIMARY KEY (id);


--
-- Name: cola_docentes PK_73d6f9fafde407314223f3fc9da; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.cola_docentes
    ADD CONSTRAINT "PK_73d6f9fafde407314223f3fc9da" PRIMARY KEY (id);


--
-- Name: curso PK_76073a915621326fb85f28ecc5d; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.curso
    ADD CONSTRAINT "PK_76073a915621326fb85f28ecc5d" PRIMARY KEY (id);


--
-- Name: usuario PK_a56c58e5cabaa04fb2c98d2d7e2; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT "PK_a56c58e5cabaa04fb2c98d2d7e2" PRIMARY KEY (id);


--
-- Name: docente PK_badad2b3623effea5d5d5b244c4; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.docente
    ADD CONSTRAINT "PK_badad2b3623effea5d5d5b244c4" PRIMARY KEY (id);


--
-- Name: preasignacion PK_bff9dd5ab198facbdd12c3272ab; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.preasignacion
    ADD CONSTRAINT "PK_bff9dd5ab198facbdd12c3272ab" PRIMARY KEY (id);


--
-- Name: seleccion_temporal PK_cf19784ba70d4582ed0c5cae606; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.seleccion_temporal
    ADD CONSTRAINT "PK_cf19784ba70d4582ed0c5cae606" PRIMARY KEY (id);


--
-- Name: curso_ambiente PK_d7e5f348f1528f3101f507983f9; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.curso_ambiente
    ADD CONSTRAINT "PK_d7e5f348f1528f3101f507983f9" PRIMARY KEY (curso_id, ambiente_id);


--
-- Name: grupo PK_dc8777104b615fea76db518334f; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.grupo
    ADD CONSTRAINT "PK_dc8777104b615fea76db518334f" PRIMARY KEY (id);


--
-- Name: notificacion_docente PK_f10adbfe0de1fbefb1ba02baa71; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.notificacion_docente
    ADD CONSTRAINT "PK_f10adbfe0de1fbefb1ba02baa71" PRIMARY KEY (id);


--
-- Name: horario_asignado PK_f5682e49f3e666b230746ab8fca; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.horario_asignado
    ADD CONSTRAINT "PK_f5682e49f3e666b230746ab8fca" PRIMARY KEY (id);


--
-- Name: ventana_atencion PK_f97e1bd6f8d7c9a9594d5848d3e; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.ventana_atencion
    ADD CONSTRAINT "PK_f97e1bd6f8d7c9a9594d5848d3e" PRIMARY KEY (id);


--
-- Name: conflicto_asignacion PK_fccc4a3268f6b62967eeed6db9e; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.conflicto_asignacion
    ADD CONSTRAINT "PK_fccc4a3268f6b62967eeed6db9e" PRIMARY KEY (id);


--
-- Name: preferencias_notificacion REL_57fad6a197efc7dcacf8f4cd17; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.preferencias_notificacion
    ADD CONSTRAINT "REL_57fad6a197efc7dcacf8f4cd17" UNIQUE (docente_id);


--
-- Name: usuario UQ_2863682842e688ca198eb25c124; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT "UQ_2863682842e688ca198eb25c124" UNIQUE (email);


--
-- Name: docente UQ_6562128cc9980256433b7a34425; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.docente
    ADD CONSTRAINT "UQ_6562128cc9980256433b7a34425" UNIQUE (email);


--
-- Name: docente UQ_8a12759d0325d14835de084f7cb; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.docente
    ADD CONSTRAINT "UQ_8a12759d0325d14835de084f7cb" UNIQUE (codigo);


--
-- Name: disponibilidad_docente UQ_bcc62518fbca64e1d6dbd2a24f1; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.disponibilidad_docente
    ADD CONSTRAINT "UQ_bcc62518fbca64e1d6dbd2a24f1" UNIQUE (docente_id, dia_semana, hora_inicio, periodo_academico);


--
-- Name: curso UQ_bcf8b1092f7f3160a0bd54c2191; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.curso
    ADD CONSTRAINT "UQ_bcf8b1092f7f3160a0bd54c2191" UNIQUE (codigo);


--
-- Name: ambiente UQ_c089d7723b83ebe8eb2c637533a; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.ambiente
    ADD CONSTRAINT "UQ_c089d7723b83ebe8eb2c637533a" UNIQUE (codigo);


--
-- Name: periodo_academico UQ_c72842a10072eddcdb6c57d6fc4; Type: CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.periodo_academico
    ADD CONSTRAINT "UQ_c72842a10072eddcdb6c57d6fc4" UNIQUE (codigo);


--
-- Name: IDX_95fc1bdc329a18f81c82173756; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX "IDX_95fc1bdc329a18f81c82173756" ON public.curso_ambiente USING btree (ambiente_id);


--
-- Name: IDX_9bcebbd70d1423ffecd9a9cb24; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX "IDX_9bcebbd70d1423ffecd9a9cb24" ON public.curso_ambiente USING btree (curso_id);


--
-- Name: idx_cola_docente; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_cola_docente ON public.cola_docentes USING btree (docente_id);


--
-- Name: idx_conflicto_ambiente_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_conflicto_ambiente_periodo ON public.conflicto_asignacion USING btree (ambiente_id, periodo_academico);


--
-- Name: idx_conflicto_docente_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_conflicto_docente_periodo ON public.conflicto_asignacion USING btree (docente_id, periodo_academico);


--
-- Name: idx_conflicto_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_conflicto_periodo ON public.conflicto_asignacion USING btree (periodo_academico);


--
-- Name: idx_dia_no_laborable_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_dia_no_laborable_periodo ON public.dia_no_laborable USING btree (periodo_academico);


--
-- Name: idx_disponibilidad_dia_hora; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_disponibilidad_dia_hora ON public.disponibilidad_docente USING btree (dia_semana, hora_inicio);


--
-- Name: idx_disponibilidad_docente_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_disponibilidad_docente_periodo ON public.disponibilidad_docente USING btree (docente_id, periodo_academico);


--
-- Name: idx_disponibilidad_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_disponibilidad_periodo ON public.disponibilidad_docente USING btree (periodo_academico);


--
-- Name: idx_grupo_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_grupo_periodo ON public.grupo USING btree (periodo_academico_id);


--
-- Name: idx_horario_ambiente_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_horario_ambiente_periodo ON public.horario_asignado USING btree (ambiente_id, periodo_academico);


--
-- Name: idx_horario_dia_hora; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_horario_dia_hora ON public.horario_asignado USING btree (dia_semana, hora_inicio);


--
-- Name: idx_horario_docente_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_horario_docente_periodo ON public.horario_asignado USING btree (docente_id, periodo_academico);


--
-- Name: idx_horario_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_horario_periodo ON public.horario_asignado USING btree (periodo_academico);


--
-- Name: idx_preasignacion_ambiente_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_preasignacion_ambiente_periodo ON public.preasignacion USING btree (ambiente_id, periodo_academico);


--
-- Name: idx_preasignacion_dia_hora; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_preasignacion_dia_hora ON public.preasignacion USING btree (dia_semana, hora_inicio);


--
-- Name: idx_preasignacion_docente_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_preasignacion_docente_periodo ON public.preasignacion USING btree (docente_id, periodo_academico);


--
-- Name: idx_preasignacion_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_preasignacion_periodo ON public.preasignacion USING btree (periodo_academico);


--
-- Name: idx_restriccion_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_restriccion_periodo ON public.restriccion_institucional USING btree (periodo_academico);


--
-- Name: idx_seleccion_ambiente; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_seleccion_ambiente ON public.seleccion_temporal USING btree (ambiente_id);


--
-- Name: idx_seleccion_dia_hora; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_seleccion_dia_hora ON public.seleccion_temporal USING btree (dia_semana, hora_inicio);


--
-- Name: idx_seleccion_docente; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_seleccion_docente ON public.seleccion_temporal USING btree (docente_id);


--
-- Name: idx_ventana_hora; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_ventana_hora ON public.ventana_atencion USING btree (hora_inicio);


--
-- Name: idx_ventana_periodo; Type: INDEX; Schema: public; Owner: unt_user
--

CREATE INDEX idx_ventana_periodo ON public.ventana_atencion USING btree (periodo_academico);


--
-- Name: horario_asignado FK_1b933c7a9093f3dac4bd5681b8c; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.horario_asignado
    ADD CONSTRAINT "FK_1b933c7a9093f3dac4bd5681b8c" FOREIGN KEY (docente_id) REFERENCES public.docente(id);


--
-- Name: conflicto_asignacion FK_2fc9ac9cdc6bda3c5d376ff7be8; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.conflicto_asignacion
    ADD CONSTRAINT "FK_2fc9ac9cdc6bda3c5d376ff7be8" FOREIGN KEY (docente_id) REFERENCES public.docente(id);


--
-- Name: preasignacion FK_3fc3c0933545955280c3805378c; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.preasignacion
    ADD CONSTRAINT "FK_3fc3c0933545955280c3805378c" FOREIGN KEY (curso_id) REFERENCES public.curso(id);


--
-- Name: disponibilidad_docente FK_41e95d4a73b916e376fd13c0ce7; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.disponibilidad_docente
    ADD CONSTRAINT "FK_41e95d4a73b916e376fd13c0ce7" FOREIGN KEY (docente_id) REFERENCES public.docente(id) ON DELETE CASCADE;


--
-- Name: notificacion_docente FK_4d7fa060e12214a8c6c0bac85ca; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.notificacion_docente
    ADD CONSTRAINT "FK_4d7fa060e12214a8c6c0bac85ca" FOREIGN KEY (docente_id) REFERENCES public.docente(id);


--
-- Name: preferencias_notificacion FK_57fad6a197efc7dcacf8f4cd179; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.preferencias_notificacion
    ADD CONSTRAINT "FK_57fad6a197efc7dcacf8f4cd179" FOREIGN KEY (docente_id) REFERENCES public.docente(id);


--
-- Name: seleccion_temporal FK_625320b63db3af652533d7f8dee; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.seleccion_temporal
    ADD CONSTRAINT "FK_625320b63db3af652533d7f8dee" FOREIGN KEY (docente_id) REFERENCES public.docente(id);


--
-- Name: grupo FK_649630a8ea21aa1924d0c42dfc0; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.grupo
    ADD CONSTRAINT "FK_649630a8ea21aa1924d0c42dfc0" FOREIGN KEY (curso_id) REFERENCES public.curso(id);


--
-- Name: horario_asignado FK_6f200f092b63505fa058e635b90; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.horario_asignado
    ADD CONSTRAINT "FK_6f200f092b63505fa058e635b90" FOREIGN KEY (ambiente_id) REFERENCES public.ambiente(id);


--
-- Name: cola_docentes FK_80a946c0f2fb09e7cf31a6fe403; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.cola_docentes
    ADD CONSTRAINT "FK_80a946c0f2fb09e7cf31a6fe403" FOREIGN KEY (docente_id) REFERENCES public.docente(id);


--
-- Name: preasignacion FK_89fe0bf4e1c5d74476d8e7a3eb2; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.preasignacion
    ADD CONSTRAINT "FK_89fe0bf4e1c5d74476d8e7a3eb2" FOREIGN KEY (ambiente_id) REFERENCES public.ambiente(id);


--
-- Name: curso_ambiente FK_95fc1bdc329a18f81c821737567; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.curso_ambiente
    ADD CONSTRAINT "FK_95fc1bdc329a18f81c821737567" FOREIGN KEY (ambiente_id) REFERENCES public.ambiente(id);


--
-- Name: cola_docentes FK_9bb3d4bc71e60397b9b4353f025; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.cola_docentes
    ADD CONSTRAINT "FK_9bb3d4bc71e60397b9b4353f025" FOREIGN KEY (ventana_id) REFERENCES public.ventana_atencion(id);


--
-- Name: curso_ambiente FK_9bcebbd70d1423ffecd9a9cb241; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.curso_ambiente
    ADD CONSTRAINT "FK_9bcebbd70d1423ffecd9a9cb241" FOREIGN KEY (curso_id) REFERENCES public.curso(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: seleccion_temporal FK_a958a243ccfa010244e96d712fb; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.seleccion_temporal
    ADD CONSTRAINT "FK_a958a243ccfa010244e96d712fb" FOREIGN KEY (ambiente_id) REFERENCES public.ambiente(id);


--
-- Name: conflicto_asignacion FK_b35a74754cbf6a759d3fc550646; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.conflicto_asignacion
    ADD CONSTRAINT "FK_b35a74754cbf6a759d3fc550646" FOREIGN KEY (ambiente_id) REFERENCES public.ambiente(id);


--
-- Name: preasignacion FK_bad90e55cd46275bd307d911901; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.preasignacion
    ADD CONSTRAINT "FK_bad90e55cd46275bd307d911901" FOREIGN KEY (docente_id) REFERENCES public.docente(id);


--
-- Name: grupo FK_beb3b07bbea70802bb351046219; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.grupo
    ADD CONSTRAINT "FK_beb3b07bbea70802bb351046219" FOREIGN KEY (periodo_academico_id) REFERENCES public.periodo_academico(id);


--
-- Name: horario_asignado FK_c01156d05e0e80f370e7a847b3e; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.horario_asignado
    ADD CONSTRAINT "FK_c01156d05e0e80f370e7a847b3e" FOREIGN KEY (grupo_id) REFERENCES public.grupo(id);


--
-- Name: horario_asignado FK_d421a367b14b6aefa44ad7d7a67; Type: FK CONSTRAINT; Schema: public; Owner: unt_user
--

ALTER TABLE ONLY public.horario_asignado
    ADD CONSTRAINT "FK_d421a367b14b6aefa44ad7d7a67" FOREIGN KEY (curso_id) REFERENCES public.curso(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 7jv6QZJZcgnEOJF4PtC3vMwjjnhFcrfB6zYlxz15fguGIS06r6subJBWsVkhPeg

