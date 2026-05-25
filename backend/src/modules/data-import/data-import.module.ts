import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { DataImportController } from './data-import.controller';
import { DataImportService } from './data-import.service';
import { CsvParserService } from './csv-parser.service';
import { CsvMapperService } from './csv-mapper.service';
import { Curso } from '../../entities/curso.entity';
import { Ambiente } from '../../entities/ambiente.entity';
import { Docente } from '../../entities/docente.entity';
import { Grupo } from '../../entities/grupo.entity';
import { DocenteCurso } from '../../entities/docente-curso.entity';
import { PeriodoAcademico } from '../../entities/periodo-academico.entity';
import { CursosModule } from '../../cursos/cursos.module';
import { AmbientesModule } from '../../ambientes/ambientes.module';
import { DocentesModule } from '../../docentes/docentes.module';
import { GruposModule } from '../../grupos/grupos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Curso,
      Ambiente,
      Docente,
      Grupo,
      DocenteCurso,
      PeriodoAcademico,
    ]),
    CacheModule.register(),
    CursosModule,
    AmbientesModule,
    DocentesModule,
    GruposModule,
  ],
  controllers: [DataImportController],
  providers: [DataImportService, CsvParserService, CsvMapperService],
  exports: [DataImportService],
})
export class DataImportModule {}
