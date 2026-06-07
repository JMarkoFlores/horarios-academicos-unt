import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v2 as cloudinary } from "cloudinary";
import { Docente } from "../../entities/docente.entity";

type UploadedSignatureFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

@Injectable()
export class DeclaracionesService {
  constructor(
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
  ) {}

  private getCloudinaryConfig() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        "Cloudinary no está configurado correctamente",
      );
    }

    return { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret };
  }

  private async uploadFirmaToCloudinary(
    docenteId: number,
    file: UploadedSignatureFile,
  ): Promise<string> {
    if (!file.mimetype?.startsWith("image/")) {
      throw new BadRequestException("El archivo de firma debe ser una imagen");
    }

    cloudinary.config(this.getCloudinaryConfig());

    const originalName = file.originalname.replace(/\.[^.]+$/, "");
    const publicId = `firma_${docenteId}_${Date.now()}`;
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

    try {
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: "firmas-docentes",
        public_id: publicId,
        resource_type: "image",
        overwrite: true,
        invalidate: true,
        filename_override: originalName,
      });

      if (!result.secure_url) {
        throw new InternalServerErrorException(
          "Cloudinary no devolvió una URL segura para la firma",
        );
      }

      return result.secure_url;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(
        "No se pudo subir la firma a Cloudinary",
      );
    }
  }

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

  async guardarFirma(docenteId: number, file: UploadedSignatureFile): Promise<string> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) {
      throw new NotFoundException("Docente no encontrado");
    }

    const firmaUrl = await this.uploadFirmaToCloudinary(docenteId, file);
    await this.docenteRepo.update(docenteId, { firma_url: firmaUrl });

    return firmaUrl;
  }
}
