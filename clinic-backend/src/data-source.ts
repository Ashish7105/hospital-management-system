// src/data-source.ts
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Queue } from './entities/queue.entity';
import { Appointment } from './entities/appointment.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'clinic_db',
  entities: [User, Doctor, Patient, Queue, Appointment],
  synchronize: false,
  logging: true,
  migrations: ['src/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
});
