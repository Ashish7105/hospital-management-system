import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport'; // ← Add this import
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { JwtStrategy } from './jwt.strategy'; // ← Add this import
import { JwtAuthGuard } from './jwt.guard'; // ← Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule, // ← Add PassportModule
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'mysecretkey123',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard], // ← Add JwtStrategy and JwtAuthGuard
  exports: [AuthService, JwtModule, JwtAuthGuard], // ← Add JwtAuthGuard to exports
})
export class AuthModule {}
