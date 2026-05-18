import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendPasswordReset(email: string, token: string): void {
    const link = `http://localhost:4200/reset-password?token=${token}`;
    this.logger.log(`[RESET PASSWORD] Para: ${email} | Enlace: ${link}`);
  }
}
