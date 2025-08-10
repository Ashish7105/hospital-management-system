import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
  ) {}

  // Get all doctors with optional filtering
  async findAll(specialization?: string, location?: string): Promise<Doctor[]> {
    const query = this.doctorRepository.createQueryBuilder('doctor')
      .where('doctor.isActive = :isActive', { isActive: true });

    if (specialization) {
      query.andWhere('doctor.specialization LIKE :specialization', 
        { specialization: `%${specialization}%` });
    }

    if (location) {
      query.andWhere('doctor.location LIKE :location', 
        { location: `%${location}%` });
    }

    return query.getMany();
  }

  // Get single doctor by ID
  async findOne(id: number): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOne({ where: { id } });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }
    return doctor;
  }

  // Create new doctor
  async create(doctorData: Partial<Doctor>): Promise<Doctor> {
    const doctor = this.doctorRepository.create(doctorData);
    return this.doctorRepository.save(doctor);
  }

  // Update existing doctor
  async update(id: number, updateData: Partial<Doctor>): Promise<Doctor> {
    await this.doctorRepository.update(id, updateData);
    return this.findOne(id);
  }

  // Soft delete
  async remove(id: number): Promise<void> {
    await this.findOne(id); // Ensure exists
    await this.doctorRepository.update(id, { isActive: false });
  }

  // Search doctors by specialization
  async searchBySpecialization(specialization: string): Promise<Doctor[]> {
    return this.doctorRepository.find({
      where: { specialization, isActive: true }
    });
  }

  // === 🔹 Fix 3 Additional Methods ===

  async findByPhone(phone: string): Promise<Doctor | null> {
    return this.doctorRepository.findOne({ where: { phone } });
  }

  async hasActiveAppointments(doctorId: number): Promise<boolean> {
    // TODO: Replace with actual appointment check
    return false;
  }

  async findBySpecialization(specialization: string): Promise<Doctor[]> {
    return this.doctorRepository.find({ where: { specialization } });
  }

  async findAvailable(): Promise<Doctor[]> {
    return this.doctorRepository.find({ where: { availability: 'Available' } });
  }

  async updateAvailability(
    id: number,
    availability: string,
    notes?: string
  ): Promise<Doctor> {
    await this.doctorRepository.update(id, { availability });
    return this.findOne(id);
  }

  async getAppointments(
    doctorId: number,
    filters?: { status?: string; date?: string }
  ): Promise<any[]> {
    // TODO: Implement real query from Appointment entity
    return [];
  }

  async getStats(): Promise<any> {
    const totalDoctors = await this.doctorRepository.count();
    const availableDoctors = await this.doctorRepository.count({
      where: { availability: 'Available' }
    });
    return {
      totalDoctors,
      availableDoctors,
      busyDoctors: totalDoctors - availableDoctors
    };
  }
}
