import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import { Usuario } from "../entities/usuario.entity";
import { RolUsuario } from "../common/enums/rol-usuario.enum";

export async function seed(dataSource: DataSource): Promise<void> {
  const usuarioRepo = dataSource.getRepository(Usuario);
  const passwordHash = await bcrypt.hash("Admin123!", 10);

  const usuarios = [
    {
      nombre: "Administrador del Sistema",
      email: "admin@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.ADMINISTRADOR_SISTEMA,
      activo: true,
    },
    {
      nombre: "Director de Escuela",
      email: "director@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    },
    {
      nombre: "Coordinador Académico",
      email: "coordinador@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    },
    {
      nombre: "Operador de Horarios",
      email: "operador@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.OPERADOR_HORARIOS,
      activo: true,
    },
  ];

  for (const u of usuarios) {
    await usuarioRepo.save(usuarioRepo.create(u));
  }
}
