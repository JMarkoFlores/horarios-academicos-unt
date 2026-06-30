import { PartialType } from "@nestjs/mapped-types";
import { CreateOfertaAcademicaDto } from "./create-oferta-academica.dto";

export class UpdateOfertaAcademicaDto extends PartialType(CreateOfertaAcademicaDto) {}
