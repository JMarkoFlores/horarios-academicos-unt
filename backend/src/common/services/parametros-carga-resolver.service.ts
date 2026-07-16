import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Docente } from "../../entities/docente.entity";
import { ParametrosCarga } from "../../entities/parametros-carga.entity";

@Injectable()
export class ParametrosCargaResolverService {
  constructor(
    @InjectRepository(ParametrosCarga)
    private readonly parametrosRepo: Repository<ParametrosCarga>,
  ) {}

  async obtenerParaPerfil(
    periodo: string,
    perfil: Pick<Docente, "tipo_docente" | "categoria" | "modalidad">,
  ): Promise<ParametrosCarga> {
    if (!perfil.tipo_docente || !perfil.categoria || !perfil.modalidad) {
      throw new BadRequestException(
        "El docente debe tener condición, categoría y modalidad para validar su carga",
      );
    }

    const parametro = await this.parametrosRepo.findOne({
      where: {
        periodo_academico: periodo,
        tipo_docente: perfil.tipo_docente,
        categoria: perfil.categoria,
        modalidad: perfil.modalidad,
      },
    });

    if (!parametro) {
      throw new BadRequestException(
        `No existe configuración de carga para ${periodo}: ${perfil.tipo_docente} / ${perfil.categoria} / ${perfil.modalidad}`,
      );
    }

    return parametro;
  }
}
