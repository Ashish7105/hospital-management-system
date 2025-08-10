// src/app.module.ts - UPDATED VERSION WITH FLEXIBLE DATABASE CONFIGURATION
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import entities
import { User } from './entities/user.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Queue } from './entities/queue.entity';
import { Appointment } from './entities/appointment.entity';

// Import modules
import { AuthModule } from './auth/auth.module';
import { DoctorModule } from './doctor/doctor.module';
import { PatientModule } from './patient/patient.module';
import { QueueModule } from './queue/queue.module';
import { AppointmentModule } from './appointment/appointment.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // ✅ PERFECT: Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    
    // ✅ UPDATED: Flexible TypeORM configuration (works with both local and cloud)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isCloudDatabase = configService.get('DB_HOST') !== 'localhost';
        
        return {
          type: 'mysql',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 3306),
          username: configService.get('DB_USERNAME', 'root'),
          password: configService.get('DB_PASSWORD', ''),
          database: configService.get('DB_DATABASE', 'clinic_db'),
          entities: [User, Doctor, Patient, Queue, Appointment],
          
          // ✅ SMART: SSL configuration based on database type
          ssl: isCloudDatabase ? false : false, // Adjust based on your cloud provider
          
          // ✅ CRITICAL: Disable automatic schema synchronization
          synchronize: false,
          migrationsRun: false,
          
          // ✅ SMART: Logging based on environment
          logging: configService.get('NODE_ENV') === 'development',
          
          // ✅ CONNECTION SETTINGS: Optimized for reliability
          retryAttempts: 10,
          retryDelay: 3000,
          autoLoadEntities: true,
          
          // ✅ CONNECTION POOL: Optimized settings
          extra: isCloudDatabase ? {
            connectionLimit: 5,
            acquireTimeout: 30000,
            timeout: 30000,
          } : {},
        };
      },
      inject: [ConfigService],
    }),

    // ✅ ENHANCED: Async JWT configuration
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'hospital-management-secret-key-2024'),
        signOptions: { 
          expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
          issuer: 'hospital-management-system',
          audience: 'hospital-staff'
        },
      }),
      inject: [ConfigService],
    }),

    // ✅ PERFECT: All your feature modules
    AuthModule,
    DoctorModule,
    PatientModule,
    QueueModule,
    AppointmentModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
