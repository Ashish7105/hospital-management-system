import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorController } from './doctor.controller';
import { DoctorService } from './doctor.service';
import { Doctor } from '../entities/doctor.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Doctor]),
    AuthModule, // Import AuthModule for JWT guard
  ],
  controllers: [DoctorController],
  providers: [DoctorService],
  exports: [DoctorService], // Export for use in other modules
})
export class DoctorModule {}
