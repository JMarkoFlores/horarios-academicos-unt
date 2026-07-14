import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("CORREO_HOST", "localhost");
    const port = parseInt(
      this.configService.get<string>("CORREO_PORT", "1025") || "1025",
      10,
    );
    const secureStr = this.configService.get<string>("SMTP_SECURE", "false");
    const secure = secureStr === "true" || secureStr === "1";
    const user = this.configService.get<string>("CORREO_USER", "");
    const pass = this.configService.get<string>("CORREO_PASS", "");

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
        from: this.configService.get<string>(
          "CORREO_FROM",
          "noreply@unt.edu.pe",
        ),
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
    const link = `http://localhost:4200/auth/reset-password?token=${token}`;
    this.logger.log(`[RESET PASSWORD] Para: ${email} | Enlace: ${link}`);
    this.sendMail(
      email,
      "Recuperación de contraseña - Horarios UNT",
      `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 56px; height: 56px; background: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 24px; font-weight: bold;">UN</span>
            </div>
            <h1 style="color: #1e293b; font-size: 24px; font-weight: 700; margin: 16px 0 8px;">Recuperación de contraseña</h1>
            <p style="color: #64748b; margin: 0; font-size: 14px;">Sistema de Gestión Académica &bull; EIS</p>
          </div>
          
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">Has solicitado restablecer tu contraseña en el sistema <strong>Horarios UNT</strong>. Haz clic en el botón de abajo para crear una nueva contraseña:</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">Restablecer contraseña</a>
          </div>
          
          <p style="color: #64748b; font-size: 13px; text-align: center;">O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #2563eb; font-size: 12px; text-align: center; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">${link}</p>
          
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">Este enlace expira en <strong>1 hora</strong>.</p>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 8px 0 0;">Si no solicitaste este cambio, ignora este correo.</p>
        </div>
      `,
    );
  }
}
