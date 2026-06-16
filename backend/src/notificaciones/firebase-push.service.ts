import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Docente } from "../entities/docente.entity";

@Injectable()
export class FirebasePushService {
  private readonly logger = new Logger(FirebasePushService.name);
  private readonly app: admin.app.App;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
  ) {
    // Inicializar Firebase Admin
    const serviceAccountPath = this.configService.get<string>(
      "FIREBASE_SERVICE_ACCOUNT_PATH",
    );

    if (serviceAccountPath) {
      try {
        const serviceAccount = require(serviceAccountPath);
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log("Firebase Admin inicializado correctamente");
      } catch (error) {
        this.logger.error("Error al inicializar Firebase Admin:", error);
        this.app = null as any;
      }
    } else {
      this.logger.warn(
        "FIREBASE_SERVICE_ACCOUNT_PATH no configurado, Firebase Push deshabilitado",
      );
      this.app = null as any;
    }
  }

  async enviarNotificacion(
    docenteId: number,
    titulo: string,
    cuerpo: string,
    datos?: Record<string, unknown>,
  ): Promise<{ exito: boolean; error?: string }> {
    if (!this.app) {
      return { exito: false, error: "Firebase no inicializado" };
    }

    try {
      const docente = await this.docenteRepo.findOne({
        where: { id: docenteId },
      });

      if (!docente || !docente.firebase_token) {
        return { exito: false, error: "Docente no tiene token Firebase" };
      }

      const message: admin.messaging.Message = {
        notification: {
          title: titulo,
          body: cuerpo,
        },
        token: docente.firebase_token,
        data: datos as Record<string, string>,
        android: {
          priority: "high",
          notification: {
            channelId: "horarios_unt",
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: titulo,
                body: cuerpo,
              },
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(
        `Notificación enviada a docente ${docenteId}: ${response}`,
      );

      return { exito: true };
    } catch (error: any) {
      // Si el token es inválido, limpiarlo
      if (error.code === "messaging/registration-token-not-registered") {
        await this.docenteRepo.update(docenteId, { firebase_token: null });
        this.logger.warn(`Token inválido para docente ${docenteId}, eliminado`);
      }

      this.logger.error(
        `Error enviando notificación a docente ${docenteId}:`,
        error,
      );
      return { exito: false, error: error.message };
    }
  }

  async enviarNotificacionMasiva(
    docenteIds: number[],
    titulo: string,
    cuerpo: string,
    datos?: Record<string, unknown>,
  ): Promise<{ exititos: number; errores: number }> {
    if (!this.app) {
      return { exititos: 0, errores: docenteIds.length };
    }

    const docentes = await this.docenteRepo.findByIds(docenteIds);
    const tokensValidos = docentes
      .filter((d) => d.firebase_token)
      .map((d) => d.firebase_token);

    if (tokensValidos.length === 0) {
      return { exititos: 0, errores: docenteIds.length };
    }

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: titulo,
        body: cuerpo,
      },
      tokens: tokensValidos,
      data: datos as Record<string, string>,
      android: {
        priority: "high",
        notification: {
          channelId: "horarios_unt",
        },
      },
    };

    try {
      const response = await admin.messaging().sendMulticast(message);

      // Limpiar tokens inválidos
      if (response.failureCount > 0) {
        const tokensAEliminar: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (
            !resp.success &&
            resp.error?.code === "messaging/registration-token-not-registered"
          ) {
            tokensAEliminar.push(tokensValidos[idx]);
          }
        });

        if (tokensAEliminar.length > 0) {
          await this.docenteRepo
            .createQueryBuilder()
            .update(Docente)
            .set({ firebase_token: null })
            .where("firebase_token IN (:...tokens)", {
              tokens: tokensAEliminar,
            })
            .execute();
          this.logger.log(
            `Eliminados ${tokensAEliminar.length} tokens inválidos`,
          );
        }
      }

      this.logger.log(
        `Notificación masiva: ${response.successCount} exitosos, ${response.failureCount} fallidos`,
      );

      return {
        exititos: response.successCount,
        errores: response.failureCount,
      };
    } catch (error: any) {
      this.logger.error("Error enviando notificación masiva:", error);
      return { exititos: 0, errores: docenteIds.length };
    }
  }

  async registrarToken(
    docenteId: number,
    token: string,
  ): Promise<{ exito: boolean; error?: string }> {
    try {
      await this.docenteRepo.update(docenteId, { firebase_token: token });
      this.logger.log(`Token registrado para docente ${docenteId}`);
      return { exito: true };
    } catch (error: any) {
      this.logger.error(
        `Error registrando token para docente ${docenteId}:`,
        error,
      );
      return { exito: false, error: error.message };
    }
  }

  async eliminarToken(docenteId: number): Promise<{ exito: boolean }> {
    try {
      await this.docenteRepo.update(docenteId, { firebase_token: null });
      this.logger.log(`Token eliminado para docente ${docenteId}`);
      return { exito: true };
    } catch (error: any) {
      this.logger.error(
        `Error eliminando token para docente ${docenteId}:`,
        error,
      );
      return { exito: false };
    }
  }
}
