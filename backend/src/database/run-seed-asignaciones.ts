import { DataSource } from 'typeorm';
import { seedAsignacionesSql } from './seed-asignaciones-sql';
import { config } from 'dotenv';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'horarios_unt',
  username: process.env.DATABASE_USER || 'unt_user',
  password: process.env.DATABASE_PASSWORD || 'unt_pass123',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

async function runSeed() {
  try {
    console.log('📡 Conectando a la base de datos...');
    await AppDataSource.initialize();
    console.log('✓ Conectado');

    console.log('🌱 Ejecutando seed de asignaciones...');
    await seedAsignacionesSql(AppDataSource);

    console.log('🎉 Seed completado exitosamente');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

runSeed();
