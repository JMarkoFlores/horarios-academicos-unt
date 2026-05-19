import { Processor, Process, OnQueueFailed, OnQueueCompleted } from "@nestjs/bull";
import { Job } from "bull";
import { Logger } from "@nestjs/common";
import { NotificacionesService, ResultadoEnvio } from "./notificaciones.service";
import { NotificacionJobData } from "./dto/notificacion-job.dto";

@Processor("notificaciones")
export class NotificacionesProcessor {
  private readonly logger = new Logger(NotificacionesProcessor.name);

  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Process({ name: "enviar-email", concurrency: 3 })
  async handleEnviarEmail(job: Job<NotificacionJobData>) {
    const intento = job.attemptsMade + 1;
    this.logger.log(
      `[Email] Procesando job ${job.id} - Intento ${intento}/3 - Docente ${job.data.docenteId}`,
    );

    try {
      const resultado = await this.notificacionesService.enviarEmail(
        job.data.docenteId,
        job.data.tipo,
        job.data.ventanaId,
        job.data.periodo,
      );

      await this.notificacionesService.registrarResultado({
        docenteId: job.data.docenteId,
        tipo: job.data.tipo,
        canal: "email",
        exito: resultado.exito,
        error: resultado.error,
        codigoError: resultado.codigoError,
        jobId: job.id?.toString(),
        intento,
      });

      if (!resultado.exito && intento < 3) {
        throw new Error(resultado.error || "Error enviando email");
      }

      return resultado;
    } catch (error: any) {
      this.logger.error(
        `[Email] Fallo en intento ${intento}: ${error.message}`,
      );
      throw error; // Re-lanzar para que Bull maneje el reintento
    }
  }

  @Process({ name: "enviar-telegram", concurrency: 3 })
  async handleEnviarTelegram(job: Job<NotificacionJobData>) {
    const intento = job.attemptsMade + 1;
    this.logger.log(
      `[Telegram] Procesando job ${job.id} - Intento ${intento}/3 - Docente ${job.data.docenteId}`,
    );

    try {
      const resultado = await this.notificacionesService.enviarTelegram(
        job.data.docenteId,
        job.data.tipo,
        job.data.ventanaId,
        job.data.periodo,
      );

      await this.notificacionesService.registrarResultado({
        docenteId: job.data.docenteId,
        tipo: job.data.tipo,
        canal: "telegram",
        exito: resultado.exito,
        error: resultado.error,
        codigoError: resultado.codigoError,
        jobId: job.id?.toString(),
        intento,
      });

      if (!resultado.exito && intento < 3) {
        throw new Error(resultado.error || "Error enviando Telegram");
      }

      return resultado;
    } catch (error: any) {
      this.logger.error(
        `[Telegram] Fallo en intento ${intento}: ${error.message}`,
      );
      throw error;
    }
  }

  @Process({ name: "notificacion-completa", concurrency: 2 })
  async handleNotificacionCompleta(job: Job<NotificacionJobData>) {
    const intento = job.attemptsMade + 1;
    this.logger.log(
      `[Completa] Procesando job ${job.id} - Intento ${intento}/3 - Docente ${job.data.docenteId}`,
    );

    const resultados: ResultadoEnvio[] = [];

    try {
      // Enviar por email si está habilitado
      if (job.data.canal === "email" || job.data.canal === "ambos") {
        const emailResult = await this.notificacionesService.enviarEmail(
          job.data.docenteId,
          job.data.tipo,
          job.data.ventanaId,
          job.data.periodo,
        );
        resultados.push(emailResult);

        await this.notificacionesService.registrarResultado({
          docenteId: job.data.docenteId,
          tipo: job.data.tipo,
          canal: "email",
          exito: emailResult.exito,
          error: emailResult.error,
          codigoError: emailResult.codigoError,
          jobId: job.id?.toString(),
          intento,
        });
      }

      // Enviar por Telegram si está habilitado
      if (job.data.canal === "telegram" || job.data.canal === "ambos") {
        const telegramResult = await this.notificacionesService.enviarTelegram(
          job.data.docenteId,
          job.data.tipo,
          job.data.ventanaId,
          job.data.periodo,
        );
        resultados.push(telegramResult);

        await this.notificacionesService.registrarResultado({
          docenteId: job.data.docenteId,
          tipo: job.data.tipo,
          canal: "telegram",
          exito: telegramResult.exito,
          error: telegramResult.error,
          codigoError: telegramResult.codigoError,
          jobId: job.id?.toString(),
          intento,
        });
      }

      // Si todos fallaron y hay intentos disponibles, reintentar
      const todosFallaron = resultados.every((r) => !r.exito);
      if (todosFallaron && intento < 3) {
        throw new Error("Todos los canales fallaron");
      }

      return resultados;
    } catch (error: any) {
      this.logger.error(
        `[Completa] Fallo en intento ${intento}: ${error.message}`,
      );
      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(
      `✅ Job ${job.id} completado exitosamente. Resultado: ${JSON.stringify(result)}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `❌ Job ${job.id} falló después de ${job.attemptsMade} intentos: ${err.message}`,
    );

    // Registrar fallo final en historial
    const data = job.data as NotificacionJobData;
    this.notificacionesService.registrarResultado({
      docenteId: data.docenteId,
      tipo: data.tipo,
      canal: data.canal === "ambos" ? "email" : data.canal,
      exito: false,
      error: err.message,
      codigoError: "JOB_FAILED",
      jobId: job.id?.toString(),
      intento: job.attemptsMade,
      final: true,
    }).catch((e) => {
      this.logger.error(`Error registrando fallo final: ${e.message}`);
    });
  }
}
