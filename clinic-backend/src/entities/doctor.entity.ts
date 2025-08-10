// src/entities/doctor.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  specialization: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  experience?: string;

  @Column({ default: 'Available' })
  availability?: string;

  // ✅ ADD THIS: isActive field for soft deletion/deactivation
  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
