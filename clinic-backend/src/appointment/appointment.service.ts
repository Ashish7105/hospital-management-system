// src/modules/appointment/appointment.service.ts - FIXED DATE TYPE ISSUES
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
  ) {}

  // ✅ FIXED: Create appointment with proper date conversion
  async create(appointmentData: {
    doctorId: number;
    patientId: number;
    appointmentDateTime: string;
    notes?: string;
    status?: string;
  }): Promise<Appointment> {
    const { doctorId, patientId, appointmentDateTime, notes, status } = appointmentData;

    // ✅ VALIDATION 1: Check if doctorId is provided
    if (!doctorId || doctorId <= 0) {
      throw new BadRequestException('Valid Doctor ID is required for appointments');
    }

    // ✅ VALIDATION 2: Check if doctor exists
    const doctor = await this.doctorRepository.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }

    // ✅ VALIDATION 3: Check if doctor is active
    if (!doctor.isActive) {
      throw new BadRequestException(`Doctor ${doctor.name} is currently inactive`);
    }

    // ✅ VALIDATION 4: Check if patient exists
    const patient = await this.patientRepository.findOne({ where: { id: patientId } });
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    // ✅ FIXED: Convert string to Date for database comparison
    const appointmentDate = new Date(appointmentDateTime);
    
    // ✅ VALIDATION: Check date is valid
    if (isNaN(appointmentDate.getTime())) {
      throw new BadRequestException('Invalid appointment date and time format');
    }

    // ✅ FIXED: Check for appointment time conflicts with proper Date comparison
    const existingAppointment = await this.appointmentRepository.findOne({
      where: {
        doctorId,
        appointmentDateTime: appointmentDate, // ✅ FIXED: Use Date object instead of string
        status: 'scheduled'
      }
    });

    if (existingAppointment) {
      throw new BadRequestException(`Doctor ${doctor.name} already has an appointment at ${appointmentDateTime}`);
    }

    // ✅ SAFE: Create appointment with validated data
    const appointment = this.appointmentRepository.create({
      doctorId,
      patientId,
      appointmentDateTime: appointmentDate, // ✅ FIXED: Store as Date object
      notes,
      status: status || 'scheduled'
    });

    return this.appointmentRepository.save(appointment);
  }

  // ✅ EXISTING: Get all appointments
  async findAll(): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      relations: ['doctor', 'patient'],
      order: { appointmentDateTime: 'ASC' }
    });
  }

  // ✅ EXISTING: Find single appointment
  async findOne(id: number): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['doctor', 'patient']
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  // ✅ ADDED: Get available doctors for appointment booking
  async getAvailableDoctors(): Promise<Doctor[]> {
    return this.doctorRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' }
    });
  }

  // ✅ FIXED: Update appointment with proper date handling
  async update(id: number, updateData: any): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['doctor', 'patient']
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    // ✅ VALIDATION: If doctorId is being updated, validate it
    if (updateData.doctorId) {
      const doctor = await this.doctorRepository.findOne({
        where: { id: updateData.doctorId, isActive: true }
      });

      if (!doctor) {
        throw new BadRequestException(`Doctor with ID ${updateData.doctorId} not found or inactive`);
      }
    }

    // ✅ FIXED: Handle appointmentDateTime conversion if provided
    let appointmentDate: Date | undefined;
    if (updateData.appointmentDateTime) {
      if (updateData.appointmentDateTime instanceof Date) {
        appointmentDate = updateData.appointmentDateTime;
      } else {
        appointmentDate = new Date(updateData.appointmentDateTime);
        if (isNaN(appointmentDate.getTime())) {
          throw new BadRequestException('Invalid appointment date and time format');
        }
      }
    }

    // ✅ FIXED: Check for time conflicts with proper Date comparison
    if (appointmentDate && updateData.doctorId) {
      const conflictingAppointment = await this.appointmentRepository.findOne({
        where: {
          doctorId: updateData.doctorId,
          appointmentDateTime: appointmentDate, // ✅ FIXED: Use Date object instead of string
          status: 'scheduled'
        }
      });

      if (conflictingAppointment && conflictingAppointment.id !== id) {
        throw new BadRequestException('Doctor already has an appointment at this time');
      }
    }

    // ✅ SAFE: Update with converted date if provided
    const updateObj = { ...updateData };
    if (appointmentDate) {
      updateObj.appointmentDateTime = appointmentDate;
    }

    Object.assign(appointment, updateObj);
    return this.appointmentRepository.save(appointment);
  }

  // ✅ EXISTING: Remove appointment
  async remove(id: number): Promise<void> {
    const appointment = await this.appointmentRepository.findOne({ where: { id } });
    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }
    await this.appointmentRepository.remove(appointment);
  }

  // ✅ EXISTING: Find appointments by doctor
  async findByDoctor(doctorId: number): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      where: { doctorId },
      relations: ['doctor', 'patient'],
      order: { appointmentDateTime: 'ASC' }
    });
  }

  // ✅ EXISTING: Find appointments by patient
  async findByPatient(patientId: number): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      where: { patientId },
      relations: ['doctor', 'patient'],
      order: { appointmentDateTime: 'ASC' }
    });
  }

  // ✅ EXISTING: Update appointment status
  async updateStatus(id: number, status: string): Promise<Appointment> {
    const appointment = await this.findOne(id);
    appointment.status = status;
    return this.appointmentRepository.save(appointment);
  }

  // ✅ FIXED: findByDate method with proper Date handling
  async findByDate(date: string): Promise<Appointment[]> {
    try {
      // Create start and end of day for precise date matching
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      
      return await this.appointmentRepository.find({
        where: {
          appointmentDateTime: Between(startOfDay, endOfDay) // ✅ CORRECT: Using Between operator
        },
        relations: ['doctor', 'patient'],
        order: {
          appointmentDateTime: 'ASC'
        }
      });
    } catch (error) {
      console.error('Error finding appointments by date:', error);
      throw new NotFoundException(`Failed to find appointments for date ${date}`);
    }
  }

  // ✅ BONUS: Additional utility methods
  async findByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    try {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      
      return await this.appointmentRepository.find({
        where: {
          appointmentDateTime: Between(start, end)
        },
        relations: ['doctor', 'patient'],
        order: {
          appointmentDateTime: 'ASC'
        }
      });
    } catch (error) {
      console.error('Error finding appointments by date range:', error);
      throw new NotFoundException(`Failed to find appointments between ${startDate} and ${endDate}`);
    }
  }

  // ✅ ADDED: Check doctor availability for a specific datetime
  async checkDoctorAvailability(doctorId: number, appointmentDateTime: string): Promise<boolean> {
    const appointmentDate = new Date(appointmentDateTime);
    
    const existingAppointment = await this.appointmentRepository.findOne({
      where: {
        doctorId,
        appointmentDateTime: appointmentDate, // ✅ FIXED: Use Date object
        status: 'scheduled'
      }
    });
    
    return !existingAppointment; // True if no conflicting appointment
  }

  // ✅ ADDED: Get appointment statistics
  async getAppointmentStats(): Promise<any> {
    const [total, scheduled, completed, cancelled] = await Promise.all([
      this.appointmentRepository.count(),
      this.appointmentRepository.count({ where: { status: 'scheduled' } }),
      this.appointmentRepository.count({ where: { status: 'completed' } }),
      this.appointmentRepository.count({ where: { status: 'cancelled' } })
    ]);

    return {
      total,
      scheduled,
      completed,
      cancelled,
      completionRate: Math.round((completed / Math.max(total, 1)) * 100),
      cancellationRate: Math.round((cancelled / Math.max(total, 1)) * 100)
    };
  }
}
