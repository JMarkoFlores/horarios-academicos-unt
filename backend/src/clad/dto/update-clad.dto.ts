import { IsString, IsOptional } from 'class-validator';

export class ObservarCladDto {
  @IsString()
  motivo_observacion: string;
}
