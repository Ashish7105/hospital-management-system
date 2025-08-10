// src/appointment/appointment.controller.ts - COMPLETELY FIXED
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body, 
  Param, 
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ParseIntPipe
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

// ✅ ADDED: Update DTO interface to handle type conversion
interface UpdateAppointmentDto {
  doctorId?: number;
  patientId?: number;
  appointmentDateTime?: string; // ✅ FRONTEND SENDS STRING
  notes?: string;
  status?: string;
}

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  // GET /appointments - Get all appointments
  @Get()
  async findAll() {
    try {
      const appointments = await this.appointmentService.findAll();
      return {
        success: true,
        data: appointments,
        count: appointments.length, // ✅ ADDED: Helpful count
        message: 'Appointments retrieved successfully'
      };
    } catch (error) {
      console.error('Fetch appointments error:', error);
      throw new HttpException(
        'Failed to fetch appointments',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ✅ ENHANCED: POST /appointments - Create new appointment with proper validation
  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createAppointmentDto: CreateAppointmentDto) {
    try {
      console.log('Received appointment data:', createAppointmentDto);
      
      // ✅ VALIDATION: Additional frontend validation
      if (!createAppointmentDto.doctorId) {
        throw new HttpException(
          {
            success: false,
            message: 'Doctor selection is required',
            field: 'doctorId'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      if (!createAppointmentDto.patientId) {
        throw new HttpException(
          {
            success: false,
            message: 'Patient selection is required',
            field: 'patientId'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      if (!createAppointmentDto.appointmentDateTime) {
        throw new HttpException(
          {
            success: false,
            message: 'Appointment date and time is required',
            field: 'appointmentDateTime'
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      const result = await this.appointmentService.create(createAppointmentDto);
      
      return {
        success: true,
        message: 'Appointment created successfully',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Appointment creation error:', error);
      
      // ✅ ENHANCED: Better error response format
      if (error instanceof HttpException) {
        throw error; // Re-throw HTTP exceptions as-is
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create appointment',
          details: error.message,
          suggestion: 'Please check that the doctor and patient exist and are valid'
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // GET /appointments/:id
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const appointment = await this.appointmentService.findOne(id);
      return {
        success: true,
        data: appointment,
        message: 'Appointment retrieved successfully'
      };
    } catch (error) {
      console.error('Find appointment error:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Appointment not found',
          appointmentId: id
        },
        HttpStatus.NOT_FOUND
      );
    }
  }

  // ✅ FIXED: PUT /appointments/:id - Fixed type conversion issue
  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateAppointmentDto: UpdateAppointmentDto
  ) {
    try {
      console.log('Updating appointment:', id, updateAppointmentDto);
      
      // ✅ SOLUTION: Convert string datetime to proper format before passing to service
      const updateData: any = { ...updateAppointmentDto };
      
      // ✅ TYPE CONVERSION: Handle appointmentDateTime string to Date conversion
      if (updateAppointmentDto.appointmentDateTime) {
        // Convert string to Date object for the entity
        updateData.appointmentDateTime = new Date(updateAppointmentDto.appointmentDateTime);
        
        // ✅ VALIDATION: Check if date is valid
        if (isNaN(updateData.appointmentDateTime.getTime())) {
          throw new HttpException(
            {
              success: false,
              message: 'Invalid appointment date and time format',
              field: 'appointmentDateTime',
              received: updateAppointmentDto.appointmentDateTime
            },
            HttpStatus.BAD_REQUEST
          );
        }
      }

      const result = await this.appointmentService.update(id, updateData);
      
      return {
        success: true,
        message: 'Appointment updated successfully',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Update appointment error:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update appointment',
          details: error.message,
          appointmentId: id
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // DELETE /appointments/:id
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.appointmentService.remove(id);
      return {
        success: true,
        message: 'Appointment deleted successfully',
        appointmentId: id,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Delete appointment error:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete appointment',
          details: error.message,
          appointmentId: id
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // ✅ ENHANCED: PUT /appointments/:id/status - Update appointment status
  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: { status: string }
  ) {
    try {
      // ✅ VALIDATION: Check valid status values
      const validStatuses = ['scheduled', 'booked', 'confirmed', 'completed', 'cancelled', 'no-show'];
      
      if (!body.status) {
        throw new HttpException(
          {
            success: false,
            message: 'Status is required',
            field: 'status'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      if (!validStatuses.includes(body.status.toLowerCase())) {
        throw new HttpException(
          {
            success: false,
            message: 'Invalid appointment status',
            field: 'status',
            validStatuses: validStatuses,
            received: body.status
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      const result = await this.appointmentService.updateStatus(id, body.status);
      
      return {
        success: true,
        message: `Appointment status updated to "${body.status}"`,
        data: result,
        previousStatus: result.status,
        newStatus: body.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Update status error:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update appointment status',
          details: error.message,
          appointmentId: id
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // ✅ ADDED: GET /appointments/by-doctor/:doctorId
  @Get('by-doctor/:doctorId')
  async findByDoctor(@Param('doctorId', ParseIntPipe) doctorId: number) {
    try {
      const appointments = await this.appointmentService.findByDoctor(doctorId);
      return {
        success: true,
        data: appointments,
        count: appointments.length,
        doctorId: doctorId,
        message: 'Doctor appointments retrieved successfully'
      };
    } catch (error) {
      console.error('Find by doctor error:', error);
      throw new HttpException(
        'Failed to fetch doctor appointments',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ✅ ADDED: GET /appointments/by-patient/:patientId
  @Get('by-patient/:patientId')
  async findByPatient(@Param('patientId', ParseIntPipe) patientId: number) {
    try {
      const appointments = await this.appointmentService.findByPatient(patientId);
      return {
        success: true,
        data: appointments,
        count: appointments.length,
        patientId: patientId,
        message: 'Patient appointments retrieved successfully'
      };
    } catch (error) {
      console.error('Find by patient error:', error);
      throw new HttpException(
        'Failed to fetch patient appointments',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ✅ ADDED: GET /appointments/today
  @Get('filter/today')
  async getTodaysAppointments() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const appointments = await this.appointmentService.findByDate(today);
      
      return {
        success: true,
        data: appointments,
        count: appointments.length,
        date: today,
        message: 'Today\'s appointments retrieved successfully'
      };
    } catch (error) {
      console.error('Get today appointments error:', error);
      throw new HttpException(
        'Failed to fetch today\'s appointments',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
