// src/modules/queue/queue.module.ts - FINAL PRODUCTION VERSION
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { Queue } from '../entities/queue.entity';
import { Patient } from '../entities/patient.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // ✅ PERFECT: TypeORM entities properly registered
    TypeOrmModule.forFeature([Queue, Patient]),
    
    // ✅ ENHANCED: Use forwardRef to prevent circular dependency issues
    forwardRef(() => AuthModule),
  ],
  controllers: [QueueController],
  providers: [QueueService],
  
  // ✅ EXCELLENT: QueueService exported for use in other modules
  exports: [
    QueueService,
    // ✅ ADDED: Also export TypeORM repositories if other modules need them
    TypeOrmModule,
  ],
})
export class QueueModule {}
