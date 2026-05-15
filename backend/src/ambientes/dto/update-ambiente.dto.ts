import { PartialType } from '@nestjs/swagger';
import { CreateAmbienteDto } from './create-ambiente.dto';

export class UpdateAmbienteDto extends PartialType(CreateAmbienteDto) {}
