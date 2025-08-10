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
  ParseIntPipe
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  // ✅ FIXED: GET /queue - Proper type handling
  @Get()
  async findAll(@Query('status') status?: string) {
    try {
      if (status) {
        const result = await this.queueService.findByStatus(status);
        // ✅ FIXED: Service returns Queue[] directly, no .data property needed
        return result || [];
      }
      
      const result = await this.queueService.findAll();
      // ✅ FIXED: Service returns Queue[] directly
      return result || [];
    } catch (error) {
      console.error('Queue fetch error:', error);
      throw new HttpException(
        'Failed to fetch queue',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ✅ FIXED: GET /queue/enhanced - Proper return type
  @Get('enhanced')
  async getEnhancedQueue() {
    try {
      const enhancedQueue = await this.queueService.getEnhancedQueue();
      
      // ✅ FIXED: Service returns array directly
      return enhancedQueue || [];
    } catch (error) {
      console.error('Enhanced queue fetch error:', error);
      throw new HttpException(
        'Failed to fetch enhanced queue data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ✅ FIXED: GET /queue/summary - Proper error handling
  @Get('summary')
  async getQueueSummary() {
    try {
      const enhancedQueue = await this.queueService.getEnhancedQueue();
      
      // ✅ FIXED: Ensure enhancedQueue is array before filtering
      const queueArray = Array.isArray(enhancedQueue) ? enhancedQueue : [];
      
      return {
        summary: {
          totalWaiting: queueArray.filter(q => q.status === 'waiting').length,
          emergencyCases: queueArray.filter(q => q.priority === 'emergency').length,
          urgentCases: queueArray.filter(q => q.priority === 'urgent').length,
          longestWait: this.calculateLongestWait(queueArray)
        },
        metadata: {
          lastUpdated: new Date().toISOString(),
          refreshInterval: '30s',
          totalRecords: queueArray.length
        }
      };
    } catch (error) {
      console.error('Queue summary error:', error);
      throw new HttpException(
        'Failed to fetch queue summary',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // GET /queue/stats - Get queue statistics
  @Get('stats')
  async getQueueStats() {
    try {
      const stats = await this.queueService.getQueueStats();
      
      return {
        ...stats,
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Queue stats error:', error);
      throw new HttpException(
        'Failed to get queue statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // GET /queue/next - Get next patient to be called
  @Get('next')
  async getNextPatient() {
    try {
      const nextPatient = await this.queueService.getNextPatient();
      
      if (!nextPatient) {
        return {
          message: 'No patients waiting in queue',
          nextPatient: null,
          queueStatus: 'empty'
        };
      }

      return {
        message: 'Next patient ready to be called',
        nextPatient,
        announcement: this.generateAnnouncement(nextPatient)
      };
    } catch (error) {
      console.error('Get next patient error:', error);
      throw new HttpException(
        'Failed to get next patient',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // GET /queue/analytics - Get comprehensive queue analytics
  @Get('analytics')
  async getQueueAnalytics() {
    try {
      const analytics = await this.queueService.getQueueAnalytics();
      
      return {
        ...analytics,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Queue analytics error:', error);
      throw new HttpException(
        'Failed to fetch queue analytics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ✅ ENHANCED: POST /queue/call-next - Call next patient
  @Post('call-next')
  async callNextPatient() {
    try {
      const result = await this.queueService.callNextPatient();
      
      if (!result || !result.patient) {
        return {
          success: false,
          message: 'No patients available to call',
          suggestion: 'Check for new registrations or scheduled appointments'
        };
      }

      return {
        success: true,
        message: 'Patient called successfully',
        announcement: this.generateDetailedAnnouncement(result.patient),
        timestamp: new Date().toISOString(),
        patient: result.patient
      };
    } catch (error) {
      console.error('Call next patient error:', error);
      throw new HttpException(
        error.message || 'Failed to call next patient',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ✅ ENHANCED: POST /queue/emergency - Add emergency patient
  @Post('emergency')
  async addEmergencyPatient(@Body() emergencyDto: { 
    patientId: number;
    priority?: string; 
  }) {
    try {
      const { patientId } = emergencyDto;
      
      if (!patientId || patientId <= 0) {
        throw new HttpException(
          'Valid Patient ID is required',
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.queueService.addEmergencyPatient(patientId);
      
      return {
        success: true,
        message: '🆘 EMERGENCY patient added with highest priority',
        queueEntry: result,
        alert: 'Emergency protocols activated',
        queueNumber: result.queueNumber || 0,
        announcement: `EMERGENCY: Queue number ${result.queueNumber || 0}, ${result.patient?.name || 'Unknown Patient'}, please proceed to emergency consultation room immediately`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Emergency patient error:', error);
      throw new HttpException(
        error.message || 'Failed to add emergency patient',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // ✅ ENHANCED: POST /queue - Add patient to queue with validation
  @Post()
  async addToQueue(@Body() addToQueueDto: {
    patientId: number;
    priority?: 'normal' | 'urgent' | 'emergency';
    notes?: string;
  }) {
    try {
      const { patientId, priority, notes } = addToQueueDto;
      
      if (!patientId || patientId <= 0) {
        throw new HttpException(
          'Valid Patient ID is required',
          HttpStatus.BAD_REQUEST
        );
      }

      // ✅ ADDED: Validate priority
      const validPriorities = ['normal', 'urgent', 'emergency'];
      if (priority && !validPriorities.includes(priority)) {
        throw new HttpException(
          `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.queueService.addToQueue(
        patientId, 
        priority || 'normal',
        notes
      );
      
      return {
        success: true,
        message: 'Patient added to queue successfully',
        queueEntry: result,
        announcement: `Patient ${result.patient?.name || 'Unknown Patient'} has been added to the queue with ${priority || 'normal'} priority`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Add to queue error:', error);
      throw new HttpException(
        error.message || 'Failed to add patient to queue',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // ✅ ENHANCED: PUT /queue/:id/status - Update patient status
  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: { status: string }
  ) {
    try {
      const { status } = updateStatusDto;
      
      if (!status) {
        throw new HttpException(
          'Status is required',
          HttpStatus.BAD_REQUEST
        );
      }

      // ✅ ADDED: Validate status values
      const validStatuses = ['waiting', 'with-doctor', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new HttpException(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.queueService.updateStatus(id, status);
      
      return {
        success: true,
        message: `Patient status updated to "${status}"`,
        queueEntry: result,
        nextAction: this.getNextAction(status),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Status update error:', error);
      throw new HttpException(
        error.message || 'Failed to update status',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // ✅ ENHANCED: PUT /queue/:id/priority - Update patient priority
  @Put(':id/priority')
  async updatePriority(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePriorityDto: { priority: 'normal' | 'urgent' | 'emergency' }
  ) {
    try {
      const { priority } = updatePriorityDto;
      
      if (!priority) {
        throw new HttpException(
          'Priority is required',
          HttpStatus.BAD_REQUEST
        );
      }

      const validPriorities = ['normal', 'urgent', 'emergency'];
      if (!validPriorities.includes(priority)) {
        throw new HttpException(
          `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.queueService.updatePriority(id, priority);
      
      return {
        success: true,
        message: `Patient priority updated to "${priority}"`,
        queueEntry: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Priority update error:', error);
      throw new HttpException(
        error.message || 'Failed to update priority',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // DELETE /queue/:id - Remove patient from queue
  @Delete(':id')
  async removeFromQueue(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await this.queueService.removeFromQueue(id);
      
      return {
        success: true,
        message: `Patient removed from queue successfully`,
        removedEntry: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Remove from queue error:', error);
      throw new HttpException(
        error.message || 'Failed to remove patient from queue',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // ✅ ENHANCED Helper Methods with proper null checks
  private generateAnnouncement(patient: any): string {
    const priorityPrefix = patient.priority === 'emergency' ? 'EMERGENCY: ' : 
                          patient.priority === 'urgent' ? 'URGENT: ' : '';
    
    const patientName = patient.patient?.name || 'Unknown Patient';
    
    return `${priorityPrefix}Queue number ${patient.queueNumber}, ${patientName}, please proceed to the consultation room`;
  }

  private generateDetailedAnnouncement(patient: any): string {
    const priorityPrefix = patient.priority === 'emergency' ? 'EMERGENCY: ' : 
                          patient.priority === 'urgent' ? 'URGENT: ' : '';
    
    const roomAssignment = patient.priority === 'emergency' ? 'emergency room' : 'consultation room';
    const patientName = patient.patient?.name || 'Unknown Patient';
    
    return `${priorityPrefix}Queue number ${patient.queueNumber}, ${patientName}, please proceed to the ${roomAssignment}`;
  }

  private getNextAction(status: string): string {
    switch (status) {
      case 'with-doctor':
        return 'Patient is now with doctor - monitor consultation progress';
      case 'completed':
        return 'Consultation completed - patient can proceed to checkout';
      case 'cancelled':
        return 'Appointment cancelled - follow up with patient if needed';
      case 'waiting':
        return 'Patient is waiting - ensure comfortable seating area';
      default:
        return 'Monitor patient status';
    }
  }

  // ✅ FIXED: Helper method with proper null/undefined checks
  private calculateLongestWait(queue: any[]): string {
    // ✅ FIXED: Handle null/undefined queue
    if (!queue || !Array.isArray(queue) || queue.length === 0) {
      return '0m';
    }
    
    const waitingQueue = queue.filter(q => q && q.status === 'waiting');
    if (waitingQueue.length === 0) {
      return '0m';
    }
    
    const now = new Date();
    let maxWaitMinutes = 0;
    
    waitingQueue.forEach(item => {
      if (item && item.createdAt) {
        const createdAt = new Date(item.createdAt);
        const waitMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
        if (waitMinutes > maxWaitMinutes) {
          maxWaitMinutes = waitMinutes;
        }
      }
    });
    
    if (maxWaitMinutes < 60) {
      return `${maxWaitMinutes}m`;
    } else {
      const hours = Math.floor(maxWaitMinutes / 60);
      const minutes = maxWaitMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  }
}
