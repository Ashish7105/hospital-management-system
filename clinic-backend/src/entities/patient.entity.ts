import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  age: number;

  @Column()
  gender: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
