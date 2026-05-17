export const userFixtures = {
  validUser: {
    id: 1,
    email: "test@example.com",
    nombre: "Test User",
    rol: "docente",
    password: "hashedPassword123",
  },
  adminUser: {
    id: 2,
    email: "admin@example.com",
    nombre: "Admin User",
    rol: "admin",
    password: "hashedPassword456",
  },
  studentUser: {
    id: 3,
    email: "student@example.com",
    nombre: "Student User",
    rol: "estudiante",
    password: "hashedPassword789",
  },
};

export const courseFixtures = {
  basicCourse: {
    id: 1,
    codigo: "CS101",
    nombre: "Introduction to Computer Science",
    creditos: 4,
    horasSemanales: 4,
  },
  advancedCourse: {
    id: 2,
    codigo: "CS201",
    nombre: "Data Structures",
    creditos: 4,
    horasSemanales: 4,
  },
};

export const scheduleFixtures = {
  basicSchedule: {
    id: 1,
    dia: "Lunes",
    horaInicio: "08:00",
    horaFin: "10:00",
    aula: "A-101",
  },
};
