// src/queue/dto/add-emergency.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AddEmergencyDto {
  @IsNotEmpty()
  @IsNumber()
  patientId: number;

  @IsOptional()
  @IsString()
  emergencyType?: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
