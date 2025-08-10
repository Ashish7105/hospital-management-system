import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Patient } from '../entities/patient.entity';
import { Doctor } from '../entities/doctor.entity';
import { Queue } from '../entities/queue.entity';
import { Appointment } from '../entities/appointment.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, Doctor, Queue, Appointment]),
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
