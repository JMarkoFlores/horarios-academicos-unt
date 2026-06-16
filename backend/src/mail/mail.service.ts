import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("SMTP_HOST", "localhost");
    const port = parseInt(
      this.configService.get<string>("SMTP_PORT", "1025") || "1025",
      10,
    );
    const secureStr = this.configService.get<string>("SMTP_SECURE", "false");
    const secure = secureStr === "true" || secureStr === "1";
    const user = this.configService.get<string>("SMTP_USER", "");
    const pass = this.configService.get<string>("SMTP_PASS", "");

    const isDev =
      this.configService.get<string>("NODE_ENV", "development") ===
      "development";

    this.logger.log(
      `Configurando SMTP: ${host}:${port} (secure: ${secure}, auth: ${user ? "si" : "no"})`,
    );

    const config: any = {
      host,
      port,
      secure,
      tls: isDev ? { rejectUnauthorized: false } : undefined,
    };

    // Solo agregar auth si hay credenciales
    if (user && pass) {
      config.auth = { user, pass };
    }

    this.transporter = nodemailer.createTransport(config);
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>("SMTP_FROM", "noreply@unt.edu.pe"),
        to,
        subject,
        html,
      });
      this.logger.log(`Email enviado a ${to}`);
      // Para Ethereal, mostrar URL de preview
      if (info.ethereal) {
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error: any) {
      this.logger.error(`❌ Error enviando email a ${to}:`);
      this.logger.error(`   Código: ${error.code || "N/A"}`);
      this.logger.error(`   Respuesta: ${error.response || error.message}`);
      this.logger.error(
        `   Servidor: ${this.configService.get<string>("SMTP_HOST")}:${this.configService.get<string>("SMTP_PORT")}`,
      );
      throw error;
    }
  }

  sendPasswordReset(email: string, token: string): void {
    const link = `http://localhost:4200/reset-password?token=${token}`;
    this.logger.log(`[RESET PASSWORD] Para: ${email} | Enlace: ${link}`);
    // Opcionalmente usar sendMail aquí
  }
}
