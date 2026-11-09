import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UserModule } from '../user/user.module.js';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
// console.log("jwtConstants: ", jwtConstants)
@Module({
  imports: [
    ConfigModule.forRoot(),
    JwtModule.register({
      global: true,
      // secret: jwtConstants.secret,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60m' }
    }), 
    // JwtModule.registerAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => ({
    //     secret: configService.get<string>('JWT_SECRET'),
    //     signOptions: {
    //       expiresIn: '60m',
    //     },
    //   }),
    // }),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule { }
