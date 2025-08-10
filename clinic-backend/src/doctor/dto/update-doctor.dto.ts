// src/doctor/dto/update-doctor.dto.ts
import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateDoctorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

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
  availability?: string;
}
