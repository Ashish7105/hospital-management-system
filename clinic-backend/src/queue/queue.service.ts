import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from '../entities/queue.entity';
import { Patient } from '../entities/patient.entity';

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(Queue)
    private queueRepository: Repository<Queue>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
  ) {}

  // Get all queue entries
  async findAll(): Promise<Queue[]> {
    return this.queueRepository.find({
      relations: ['patient'],
      order: {
        priority: 'DESC',
        queueNumber: 'ASC'
      }
    });
  }

  // Get queue entries by status
  async findByStatus(status: string): Promise<Queue[]> {
    return this.queueRepository.find({
      relations: ['patient'],
      where: { status },
      order: {
        priority: 'DESC',
        queueNumber: 'ASC'
      }
    });
  }

  // ✅ FIXED: Add patient to queue - matches your entity perfectly
  async addToQueue(
    patientId: number, 
    priority: string = 'normal', 
    notes?: string // Optional parameter even though not in entity
  ): Promise<Queue> {
    const patient = await this.patientRepository.findOne({ 
      where: { id: patientId } 
    });
    
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    // Check if patient is already in waiting queue
    const existingQueue = await this.queueRepository.findOne({
      where: { patientId, status: 'waiting' } // ✅ FIXED: Use patientId column
    });
    
    if (existingQueue) {
      throw new BadRequestException('Patient is already in the waiting queue');
    }

    // Generate queue number based on priority
    let queueNumber: number;
    
    if (priority === 'emergency') {
      queueNumber = 0; // Emergency patients get priority
    } else {
      const queueCount = await this.queueRepository.count();
      queueNumber = queueCount + 1;
    }

    // ✅ FIXED: Create entity with exact properties from your entity
    const queueEntry = this.queueRepository.create({
      queueNumber,
      patientId, // ✅ CORRECT: Your entity has patientId column
      status: 'waiting',
      priority
      // ✅ REMOVED: notes not in your entity definition
    });

    const savedEntry = await this.queueRepository.save(queueEntry);
    
    // Return with patient relation loaded
    return this.queueRepository.findOne({
      where: { id: savedEntry.id },
      relations: ['patient']
    }) as Promise<Queue>; // ✅ FIXED: Type assertion since we know it exists
  }

  // ✅ FIXED: Add emergency patient
  async addEmergencyPatient(patientId: number): Promise<Queue> {
    const patient = await this.patientRepository.findOne({ 
      where: { id: patientId } 
    });
    
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    // Check if patient is already in queue
    const existingQueue = await this.queueRepository.findOne({
      where: { patientId, status: 'waiting' } // ✅ FIXED: Use patientId column
    });
    
    if (existingQueue) {
      // Update existing entry to emergency priority
      existingQueue.priority = 'emergency';
      existingQueue.queueNumber = 0;
      return this.queueRepository.save(existingQueue);
    }

    // ✅ FIXED: Create with your entity structure
    const queueEntry = this.queueRepository.create({
      queueNumber: 0,
      patientId, // ✅ CORRECT: Use patientId column
      status: 'waiting',
      priority: 'emergency'
    });

    const savedEntry = await this.queueRepository.save(queueEntry);
    
    // Return with patient relation loaded
    return this.queueRepository.findOne({
      where: { id: savedEntry.id },
      relations: ['patient']
    }) as Promise<Queue>; // ✅ FIXED: Type assertion
  }

  // ✅ FIXED: Update patient status with proper status validation
  async updateStatus(queueId: number, status: string): Promise<Queue> {
    const validStatuses = ['waiting', 'with-doctor', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const queueEntry = await this.queueRepository.findOne({
      where: { id: queueId },
      relations: ['patient']
    });

    if (!queueEntry) {
      throw new NotFoundException(`Queue entry with ID ${queueId} not found`);
    }

    // ✅ FIXED: Map frontend status to your database format
    const statusMapping = {
      'waiting': 'waiting',
      'with-doctor': 'with_doctor', // Your entity uses underscore
      'completed': 'completed',
      'cancelled': 'cancelled'
    };

    queueEntry.status = statusMapping[status] || status;
    return this.queueRepository.save(queueEntry);
  }

  // ✅ ADDED: Update priority method that was missing
  async updatePriority(queueId: number, priority: string): Promise<Queue> {
    const validPriorities = ['normal', 'urgent', 'emergency'];
    if (!validPriorities.includes(priority)) {
      throw new BadRequestException(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }

    const queueEntry = await this.queueRepository.findOne({
      where: { id: queueId },
      relations: ['patient']
    });

    if (!queueEntry) {
      throw new NotFoundException(`Queue entry with ID ${queueId} not found`);
    }

    queueEntry.priority = priority;
    
    // Adjust queue number based on priority
    if (priority === 'emergency') {
      queueEntry.queueNumber = 0;
    } else if (priority === 'urgent' && queueEntry.queueNumber === 0) {
      const queueCount = await this.queueRepository.count({
        where: { priority: 'urgent' }
      });
      queueEntry.queueNumber = queueCount + 1;
    }

    return this.queueRepository.save(queueEntry);
  }

  // Get next patient to be called
  async getNextPatient(): Promise<Queue | null> {
    return this.queueRepository.findOne({
      where: { status: 'waiting' },
      relations: ['patient'],
      order: {
        priority: 'DESC',
        queueNumber: 'ASC'
      }
    });
  }

  // Get queue statistics
  async getQueueStats(): Promise<any> {
    const [total, waiting, withDoctor, completed, urgent, emergency] = await Promise.all([
      this.queueRepository.count(),
      this.queueRepository.count({ where: { status: 'waiting' } }),
      this.queueRepository.count({ where: { status: 'with_doctor' } }),
      this.queueRepository.count({ where: { status: 'completed' } }),
      this.queueRepository.count({ where: { priority: 'urgent', status: 'waiting' } }),
      this.queueRepository.count({ where: { priority: 'emergency', status: 'waiting' } })
    ]);

    return {
      total,
      waiting,
      withDoctor,
      completed,
      urgent,
      emergency,
      averageWaitTime: this.calculateAverageWaitTime(waiting),
      efficiency: Math.round((completed / Math.max(total, 1)) * 100)
    };
  }

  // ✅ FIXED: Remove patient from queue with proper return
  async removeFromQueue(queueId: number): Promise<Queue> {
    const queueEntry = await this.queueRepository.findOne({ 
      where: { id: queueId },
      relations: ['patient']
    });
    
    if (!queueEntry) {
      throw new NotFoundException(`Queue entry with ID ${queueId} not found`);
    }
    
    // Store entry before removal
    const entryToReturn = { ...queueEntry };
    await this.queueRepository.remove(queueEntry);
    
    return entryToReturn as Queue;
  }

  // Get enhanced queue with wait times and positions
  async getEnhancedQueue(): Promise<any[]> {
    const queue = await this.queueRepository.find({
      relations: ['patient'],
      where: { status: 'waiting' },
      order: {
        priority: 'DESC',
        queueNumber: 'ASC'
      }
    });

    return queue.map((entry, index) => ({
      ...entry,
      position: index + 1,
      estimatedWaitTime: this.calculateWaitTime(index),
      statusColor: this.getStatusColor(entry.status),
      priorityBadge: this.getPriorityBadge(entry.priority),
      isUrgent: entry.priority === 'urgent' || entry.priority === 'emergency',
      timeInQueue: this.calculateTimeInQueue(entry.createdAt)
    }));
  }

  // Get comprehensive queue analytics
  async getQueueAnalytics(): Promise<any> {
    const [hourlyData, priorityDistribution, statusTrends] = await Promise.all([
      this.getHourlyQueueData(),
      this.getPriorityDistribution(),
      this.getStatusTrends()
    ]);

    return {
      hourlyFlow: hourlyData,
      priorityBreakdown: priorityDistribution,
      statusDistribution: statusTrends,
      peakHours: this.identifyPeakHours(hourlyData),
      recommendations: this.generateRecommendations(hourlyData, priorityDistribution)
    };
  }

  // ✅ FIXED: Call next patient with proper null handling
  async callNextPatient(): Promise<{ patient: Queue | null; announcement: string }> {
    const nextPatient = await this.getNextPatient();
    
    if (!nextPatient) {
      return {
        patient: null,
        announcement: "No patients waiting in queue"
      };
    }

    // Update status to with-doctor
    const updatedPatient = await this.updateStatus(nextPatient.id, 'with-doctor');
    const announcement = this.generateAnnouncement(updatedPatient);

    return {
      patient: updatedPatient,
      announcement
    };
  }

  // ⏳ Helper: Calculate wait time for position
  private calculateWaitTime(position: number): string {
    const minutes = position * 15;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  }

  // ⏳ Helper: Calculate average wait time
  private calculateAverageWaitTime(waitingCount: number): string {
    const avgMinutes = waitingCount * 15;
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // 🎨 Helper: Get status colors for UI
  private getStatusColor(status: string): string {
    const colors = {
      'waiting': '#fbbf24',
      'with_doctor': '#3b82f6',
      'with-doctor': '#3b82f6', // Support both formats
      'completed': '#10b981',
      'cancelled': '#ef4444'
    };
    return colors[status] || '#6b7280';
  }

  // 🏷️ Helper: Get priority badges
  private getPriorityBadge(priority: string): string {
    const badges = {
      'emergency': '🆘 EMERGENCY',
      'urgent': '🚨 URGENT',
      'normal': '⏳ Normal'
    };
    return badges[priority] || '⏳ Normal';
  }

  // ⏰ Helper: Calculate time patient has been in queue
  private calculateTimeInQueue(createdAt: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(createdAt).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  }

  // 📊 Helper methods for analytics (keeping existing implementation)
  private async getHourlyQueueData(): Promise<any[]> {
    return [
      { hour: '8AM', patients: 8, avgWaitTime: '10m' },
      { hour: '9AM', patients: 12, avgWaitTime: '15m' },
      { hour: '10AM', patients: 18, avgWaitTime: '25m' },
      { hour: '11AM', patients: 25, avgWaitTime: '35m' },
      { hour: '12PM', patients: 15, avgWaitTime: '20m' },
      { hour: '1PM', patients: 8, avgWaitTime: '10m' },
      { hour: '2PM', patients: 22, avgWaitTime: '30m' },
      { hour: '3PM', patients: 20, avgWaitTime: '25m' },
      { hour: '4PM', patients: 16, avgWaitTime: '20m' },
      { hour: '5PM', patients: 12, avgWaitTime: '15m' }
    ];
  }

  private async getPriorityDistribution(): Promise<any[]> {
    const [normal, urgent, emergency] = await Promise.all([
      this.queueRepository.count({ where: { priority: 'normal', status: 'waiting' } }),
      this.queueRepository.count({ where: { priority: 'urgent', status: 'waiting' } }),
      this.queueRepository.count({ where: { priority: 'emergency', status: 'waiting' } })
    ]);

    const total = normal + urgent + emergency;

    return [
      { priority: 'Normal', count: normal, color: '#10b981', percentage: Math.round((normal / Math.max(total, 1)) * 100) },
      { priority: 'Urgent', count: urgent, color: '#f59e0b', percentage: Math.round((urgent / Math.max(total, 1)) * 100) },
      { priority: 'Emergency', count: emergency, color: '#ef4444', percentage: Math.round((emergency / Math.max(total, 1)) * 100) }
    ];
  }

  private async getStatusTrends(): Promise<any[]> {
    const [waiting, withDoctor, completed] = await Promise.all([
      this.queueRepository.count({ where: { status: 'waiting' } }),
      this.queueRepository.count({ where: { status: 'with_doctor' } }),
      this.queueRepository.count({ where: { status: 'completed' } })
    ]);

    const total = waiting + withDoctor + completed;

    return [
      { status: 'Waiting', count: waiting, percentage: Math.round((waiting / Math.max(total, 1)) * 100), color: '#fbbf24' },
      { status: 'With Doctor', count: withDoctor, percentage: Math.round((withDoctor / Math.max(total, 1)) * 100), color: '#3b82f6' },
      { status: 'Completed', count: completed, percentage: Math.round((completed / Math.max(total, 1)) * 100), color: '#10b981' }
    ];
  }

  private identifyPeakHours(hourlyData: any[]): string[] {
    const avgPatients = hourlyData.reduce((sum, hour) => sum + hour.patients, 0) / hourlyData.length;
    return hourlyData
      .filter(hour => hour.patients > avgPatients * 1.2)
      .map(hour => hour.hour);
  }

  private generateRecommendations(hourlyData: any[], priorityData: any[]): string[] {
    const recommendations: string[] = [];
    
    const peakHours = this.identifyPeakHours(hourlyData);
    if (peakHours.length > 0) {
      recommendations.push(`Consider adding more staff during peak hours: ${peakHours.join(', ')}`);
    }

    const emergencyCount = priorityData.find(p => p.priority === 'Emergency')?.count || 0;
    if (emergencyCount > 3) {
      recommendations.push('High emergency case volume - ensure emergency protocols are active');
    }

    const totalWaiting = priorityData.reduce((sum, p) => sum + p.count, 0);
    if (totalWaiting > 20) {
      recommendations.push('Queue is getting long - consider optimizing patient flow');
    }

    return recommendations;
  }

  private generateAnnouncement(patient: Queue): string {
    const priorityPrefix = patient.priority === 'emergency' ? 'EMERGENCY: ' : 
                          patient.priority === 'urgent' ? 'URGENT: ' : '';
    
    const patientName = patient.patient?.name || 'Unknown Patient';
    
    return `${priorityPrefix}Queue number ${patient.queueNumber}, ${patientName}, please proceed to the consultation room`;
  }
}
