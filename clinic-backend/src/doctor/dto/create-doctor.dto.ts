// src/doctor/dto/create-doctor.dto.ts - CORRECTED VERSION
import { IsNotEmpty, IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class CreateDoctorDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  specialization: string;

  @IsNotEmpty()
  @IsString()
  availability: string;

  // ✅ THESE SHOULD BE OPTIONAL (matching your database)
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsString()
  gender?: string; // Will use database default 'Not Specified'

  @IsOptional()
  @IsString()
  location?: string; // Will use database default 'Not Specified'

  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // Will use database default true
}
