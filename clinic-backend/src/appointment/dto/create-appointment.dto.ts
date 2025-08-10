// src/appointment/dto/create-appointment.dto.ts - FIXED DTO
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsNumber()
  doctorId: number;

  @IsNotEmpty()
  @IsNumber()
  patientId: number;

  // ✅ OPTION 1: Change to single appointmentDateTime property
  @IsNotEmpty()
  @IsString()
  appointmentDateTime: string; // ✅ FIXED: This matches your service expectation

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string = 'booked';
}
