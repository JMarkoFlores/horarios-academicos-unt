import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RolesGuard } from "./guards/roles.guard";
import { Usuario } from "../entities/usuario.entity";
import { Docente } from "../entities/docente.entity";
import { MailService } from "../mail/mail.service";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [
    CommonModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: config.get<string>("JWT_EXPIRACION", "8h"),
        },
      }),
    }),
    TypeOrmModule.forFeature([Usuario, Docente]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MailService, RolesGuard],
  exports: [AuthService, JwtModule, PassportModule, RolesGuard],
})
export class AuthModule {}
