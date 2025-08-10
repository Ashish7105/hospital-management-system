import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Patient } from './patient.entity';

@Entity('queue')
export class Queue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  queueNumber: number;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  patientId: number;

  @Column({ default: 'waiting' }) // waiting, with_doctor, completed
  status: string;

  @Column({ default: 'normal' }) // normal, urgent
  priority: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
