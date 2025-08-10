// src/doctor/doctor.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body, 
  Param, 
  HttpException,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ParseIntPipe
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('doctors')
@UseGuards(JwtAuthGuard)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get()
  async findAll() {
    try {
      const doctors = await this.doctorService.findAll();
      return {
        success: true,
        data: doctors,
        message: 'Doctors retrieved successfully',
        count: doctors.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching doctors:', error);
      throw new HttpException({
        success: false,
        message: 'Failed to fetch doctors',
        details: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const doctor = await this.doctorService.findOne(id);
      if (!doctor) {
        throw new HttpException({
          success: false,
          message: `Doctor with ID ${id} not found`
        }, HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: doctor,
        message: 'Doctor retrieved successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching doctor:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException({
        success: false,
        message: 'Failed to fetch doctor',
        details: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() createDoctorDto: CreateDoctorDto) {
    try {
      console.log('Creating doctor:', createDoctorDto);
      const result = await this.doctorService.create(createDoctorDto);
      
      return {
        success: true,
        data: result,
        message: 'Doctor created successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating doctor:', error);
      throw new HttpException({
        success: false,
        message: 'Failed to create doctor',
        details: error.message
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDoctorDto: UpdateDoctorDto) {
    try {
      console.log(`Updating doctor ${id}:`, updateDoctorDto);
      const result = await this.doctorService.update(id, updateDoctorDto);
      
      return {
        success: true,
        data: result,
        message: 'Doctor updated successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error updating doctor:', error);
      throw new HttpException({
        success: false,
        message: 'Failed to update doctor',
        details: error.message
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.doctorService.remove(id);
      return {
        success: true,
        message: 'Doctor deleted successfully',
        deletedId: id,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error deleting doctor:', error);
      throw new HttpException({
        success: false,
        message: 'Failed to delete doctor',
        details: error.message
      }, HttpStatus.BAD_REQUEST);
    }
  }
}
