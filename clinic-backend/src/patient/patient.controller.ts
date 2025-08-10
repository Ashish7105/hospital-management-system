import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query,
  HttpException,
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { Patient } from '../entities/patient.entity';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  // GET /patients - Get all patients
  @Get()
  async findAll() {
    try {
      return await this.patientService.findAll();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch patients',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // GET /patients/:id - Get single patient
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.patientService.findOne(+id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Patient not found',
        HttpStatus.NOT_FOUND
      );
    }
  }

  // POST /patients - Create new patient
  @Post()
  async create(@Body() createPatientDto: {
    name: string;
    phone: string;
    email?: string;
    age: number;
    gender: string;
  }) {
    try {
      const { name, phone, email, age, gender } = createPatientDto;
      
      // Validate required fields
      if (!name || !phone || !age || !gender) {
        throw new HttpException(
          'Required fields: name, phone, age, gender',
          HttpStatus.BAD_REQUEST
        );
      }

      // Check if phone already exists
      const existingPatient = await this.patientService.findByPhone(phone);
      if (existingPatient) {
        throw new HttpException(
          'Patient with this phone number already exists',
          HttpStatus.CONFLICT
        );
      }

      return await this.patientService.create({
        name,
        phone,
        email,
        age,
        gender
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create patient',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // PUT /patients/:id - Update patient
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePatientDto: Partial<Patient>
  ) {
    try {
      return await this.patientService.update(+id, updatePatientDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update patient',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // GET /patients/search?name=searchterm - Search patients by name
  @Get('search/name')
  async searchByName(@Query('name') name: string) {
    try {
      if (!name) {
        throw new HttpException(
          'Name parameter is required',
          HttpStatus.BAD_REQUEST
        );
      }
      return await this.patientService.searchByName(name);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to search patients',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
