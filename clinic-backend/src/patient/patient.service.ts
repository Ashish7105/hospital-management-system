import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../entities/patient.entity';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
  ) {}

  // Get all patients
  async findAll(): Promise<Patient[]> {
    return this.patientRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  // Get single patient by ID
  async findOne(id: number): Promise<Patient> {
    const patient = await this.patientRepository.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }

  // Create new patient
  async create(patientData: Partial<Patient>): Promise<Patient> {
    const patient = this.patientRepository.create(patientData);
    return this.patientRepository.save(patient);
  }

  // Update existing patient
  async update(id: number, updateData: Partial<Patient>): Promise<Patient> {
    await this.patientRepository.update(id, updateData);
    return this.findOne(id);
  }

  // Search patients by name
  async searchByName(name: string): Promise<Patient[]> {
    return this.patientRepository
      .createQueryBuilder('patient')
      .where('patient.name LIKE :name', { name: `%${name}%` })
      .getMany();
  }

  // Search patients by phone
  async findByPhone(phone: string): Promise<Patient | null> {
    return this.patientRepository.findOne({ where: { phone } });
  }
}
