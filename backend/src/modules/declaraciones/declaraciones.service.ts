import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as fs from "fs";
import * as path from "path";
import { Docente } from "../../entities/docente.entity";

@Injectable()
export class DeclaracionesService {
  constructor(
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
  ) {}

  async getDocentesActivos(): Promise<Docente[]> {
    return this.docenteRepo.find({
      where: { activo: true },
      select: ["id", "codigo", "nombres", "apellidos", "email"],
      order: { apellidos: "ASC", nombres: "ASC" },
    });
  }

  async getDocenteById(id: number): Promise<Docente | null> {
    return this.docenteRepo.findOne({
      where: { id, activo: true },
      select: [
        "id",
        "codigo",
        "nombres",
        "apellidos",
        "email",
        "categoria",
        "tipo_contrato",
      ],
    });
  }

  async getFirma(docenteId: number): Promise<{ firma_url: string | null }> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
      select: ["firma_url"],
    });
    return { firma_url: docente?.firma_url || null };
  }

  async guardarFirma(docenteId: number, file: any): Promise<string> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) {
      throw new NotFoundException("Docente no encontrado");
    }

    const uploadDir = path.join(process.cwd(), "uploads", "firmas");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname);
    const fileName = `firma_${docenteId}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const relativeUrl = `/uploads/firmas/${fileName}`;
    await this.docenteRepo.update(docenteId, { firma_url: relativeUrl });

    return relativeUrl;
  }
}
