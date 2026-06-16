import { SetMetadata } from "@nestjs/common";

export const REQUIERE_ALCANCE_KEY = "requiereAlcance";
export const RequiereAlcance = () => SetMetadata(REQUIERE_ALCANCE_KEY, true);
