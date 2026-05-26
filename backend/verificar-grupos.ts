import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { Grupo } from './src/entities/grupo.entity';
import { Curso } from './src/entities/curso.entity';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  database: process.env.DATABASE_NAME ?? 'horarios_unt',
  username: process.env.DATABASE_USER ?? 'unt_user',
  password: process.env.DATABASE_PASSWORD ?? 'unt_pass123',
  entities: [join(__dirname, 'src', '**', '*.entity.{ts,js}')],
  synchronize: false,
  ssl: false,
});

async function verificarGrupos() {
  await AppDataSource.initialize();
  const grupoRepo = AppDataSource.getRepository(Grupo);
  const cursoRepo = AppDataSource.getRepository(Curso);

  const curso = await cursoRepo.findOne({ where: { codigo: 'EE-102' } });
  console.log(`Curso EE-102: ${curso?.nombre} (id: ${curso?.id})`);

  const grupos = await grupoRepo.find({ 
    where: { curso_id: curso?.id },
    order: { id: 'ASC' }
  });

  console.log(`Grupos encontrados para EE-102: ${grupos.length}`);
  for (const grupo of grupos) {
    console.log(`  - id: ${grupo.id}, codigo: ${grupo.codigo}, nombre: ${grupo.nombre}`);
  }

  await AppDataSource.destroy();
}

verificarGrupos().catch(console.error);
