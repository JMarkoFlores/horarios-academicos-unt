import { DataSource } from 'typeorm';
import { Ambiente } from '../src/entities/ambiente.entity';
import { Curso } from '../src/entities/curso.entity';
import { TipoAmbiente } from '../src/common/enums/tipo-ambiente.enum';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function updateDatos() {
  // Usar la misma configuración que data-source.ts
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'horarios_unt',
    username: process.env.DATABASE_USER || 'unt_user',
    password: process.env.DATABASE_PASSWORD || 'unt_pass123',
    entities: [Ambiente, Curso],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Conectado a la base de datos');

    const ambienteRepo = dataSource.getRepository(Ambiente);
    const cursoRepo = dataSource.getRepository(Curso);

    // Actualizar coordenadas de ambientes
    console.log('Actualizando coordenadas de ambientes...');
    
    // Escuela de Postgrado UNT - Aulas (Piso 1)
    const aulasPostgrado = await ambienteRepo.find({
      where: [
        { tipo: TipoAmbiente.AULA },
      ],
    });
    
    let aulasActualizadas = 0;
    for (const aula of aulasPostgrado) {
      if (!aula.coordX) {
        aula.coordX = 100 + Math.random() * 50;
        aula.coordY = 200 + Math.random() * 50;
        aula.edificio = aula.edificio || 'Escuela de Postgrado';
        aula.piso = aula.piso || 1;
        aula.pabellon = aula.pabellon || 'Pabellón A';
        aula.sede = aula.sede || 'Escuela de Postgrado UNT';
        await ambienteRepo.save(aula);
        aulasActualizadas++;
      }
    }

    // Laboratorios - Segundo Piso Oficina Registro Técnico
    const laboratorios = await ambienteRepo.find({
      where: { tipo: TipoAmbiente.LABORATORIO },
    });
    
    let labsActualizados = 0;
    for (const lab of laboratorios) {
      if (!lab.coordX) {
        lab.coordX = 300 + Math.random() * 50;
        lab.coordY = 400 + Math.random() * 50;
        lab.edificio = lab.edificio || 'Oficina Registro Técnico';
        lab.piso = lab.piso || 2;
        lab.pabellon = lab.pabellon || 'Laboratorios';
        lab.sede = lab.sede || 'Oficina Registro Técnico';
        await ambienteRepo.save(lab);
        labsActualizados++;
      }
    }

    console.log(`Coordenadas actualizadas: ${aulasActualizadas} aulas, ${labsActualizados} laboratorios`);

    // Actualizar prerequisitos de cursos según Plan de Estudios Ingeniería de Sistemas 2018
    console.log('Actualizando prerequisitos de cursos...');
    
    const prerequisitosMap: Record<string, string> = {
      // II CICLO
      'EG-203': 'EG-102',
      'EG-204': 'EG-104',
      'EG-205': 'EG-104',
      'EE-201': 'EE-102',
      
      // III CICLO
      'EP-301': 'EG-201',
      'EE-301': 'EE-101',
      'EP-302': 'EG-105',
      'EP-303': 'EG-204',
      'EP-304': 'EG-205',
      'EE-302': 'EE-201',
      
      // IV CICLO
      'EP-401': 'EP-301',
      'EE-401': 'EE-302',
      'EP-402': 'EE-301',
      'EP-403': 'EP-301',
      'EE-402': 'EP-303,EP-304',
      'EE-403': 'EE-302',
      
      // V CICLO
      'EP-501': 'EP-401',
      'EE-501': 'EE-401',
      'EP-502': 'EP-402',
      'EE-502': 'EP-403,EE-403',
      'EE-503': 'EE-402',
      'EE-504': 'EE-401,EE-403',
      
      // VI CICLO
      'EP-601': 'EP-501',
      'EE-601': 'EE-301,EE-503',
      'EP-602': 'EP-501,EP-502',
      'EE-602': 'EE-501',
      'EE-603': 'EE-503',
      'EE-604': 'EE-502,EE-504',
      
      // VII CICLO
      'EP-701': 'EP-601',
      'EE-701': 'EE-601,EE-604',
      'EI-701': 'EP-302',
      'EE-702': 'EP-602,EE-602',
      'EE-703': 'EE-603',
      'EE-704': 'EE-604',
      
      // VIII CICLO
      'EP-801': 'EE-501,EP-701',
      'EE-801': 'EE-701,EE-703',
      'EE-802': 'EE-703,EE-704',
      'EE-803': 'EE-702',
      'EE-804': 'EE-703',
      'EE-805': 'EE-704',
      
      // IX CICLO
      'EE-901': 'EE-701,EE-802',
      'EE-902': 'EE-801',
      'EI-901': 'EI-701',
      'EE-903': 'EP-801,EE-803',
      'EE-904': 'EE-804',
      'EE-905': 'EE-804,EE-805',
      
      // X CICLO
      'EE-X01': 'EE-901',
      'EE-X02': 'EE-901',
      'EI-X01': 'EI-901',
      'EE-X03': 'EE-902,EE-904',
      'EP-X01': 'EE-901',
      'EE-X04': 'EE-905',
    };

    let actualizados = 0;
    for (const [codigo, prerequisitos] of Object.entries(prerequisitosMap)) {
      const curso = await cursoRepo.findOne({ where: { codigo } });
      if (curso) {
        curso.prerequisitos = prerequisitos;
        await cursoRepo.save(curso);
        actualizados++;
        console.log(`  - ${codigo}: ${prerequisitos}`);
      }
    }

    console.log(`Prerequisitos actualizados para ${actualizados} cursos`);
    console.log('Actualización completada exitosamente');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

updateDatos();
