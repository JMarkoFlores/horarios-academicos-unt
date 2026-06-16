import { PartialType } from '@nestjs/mapped-types';
import { CreateCargaAdicionalDto } from './create-carga-adicional.dto';

export class UpdateCargaAdicionalDto extends PartialType(CreateCargaAdicionalDto) {}
