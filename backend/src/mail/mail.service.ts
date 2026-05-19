import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>("SMTP_HOST", "localhost"),
      port: this.configService.get<number>("SMTP_PORT", 1025),
      secure: this.configService.get<boolean>("SMTP_SECURE", false),
      auth: {
        user: this.configService.get<string>("SMTP_USER", ""),
        pass: this.configService.get<string>("SMTP_PASS", ""),
      },
    });
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>("SMTP_FROM", "noreply@unt.edu.pe"),
        to,
        subject,
        html,
      });
      this.logger.log(`Email enviado a ${to}`);
    } catch (error) {
      this.logger.error(`Error enviando email a ${to}:`, error);
      throw error;
    }
  }

  sendPasswordReset(email: string, token: string): void {
    const link = `http://localhost:4200/reset-password?token=${token}`;
    this.logger.log(`[RESET PASSWORD] Para: ${email} | Enlace: ${link}`);
    // Opcionalmente usar sendMail aquí
  }
}
