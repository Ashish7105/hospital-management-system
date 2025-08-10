import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
import { Patient } from '../entities/patient.entity';
import { Doctor } from '../entities/doctor.entity';
import { Queue } from '../entities/queue.entity';
import { Appointment } from '../entities/appointment.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
    @InjectRepository(Queue)
    private queueRepository: Repository<Queue>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
  ) {}

  async getDashboardStats() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get all stats in parallel for better performance
    const [
      totalPatients,
      newPatientsToday,
      totalDoctors,
      activeDoctors,
      queueWaiting,
      queueWithDoctor,
      queueCompleted,
      urgentQueue,
      todayAppointments,
      completedAppointments,
      totalAppointments
    ] = await Promise.all([
      this.patientRepository.count(),
      this.patientRepository.count({
        where: { createdAt: MoreThan(todayStart) }
      }),
      this.doctorRepository.count(),
      this.doctorRepository.count({ where: { isActive: true } }),
      this.queueRepository.count({ where: { status: 'waiting' } }),
      this.queueRepository.count({ where: { status: 'with_doctor' } }),
      this.queueRepository.count({ where: { status: 'completed' } }),
      this.queueRepository.count({ where: { priority: 'urgent', status: 'waiting' } }),
      this.appointmentRepository.count({
        where: { 
          appointmentDateTime: Between(todayStart, todayEnd)
        }
      }),
      this.appointmentRepository.count({
        where: { 
          appointmentDateTime: Between(todayStart, todayEnd),
          status: 'completed'
        }
      }),
      this.appointmentRepository.count()
    ]);

    return {
      overview: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        systemStatus: 'Active'
      },
      todayStats: {
        newPatients: newPatientsToday,
        appointments: todayAppointments,
        completedAppointments,
        activeDoctors
      },
      queueStats: {
        waiting: queueWaiting,
        withDoctor: queueWithDoctor,
        completed: queueCompleted,
        urgent: urgentQueue,
        totalInQueue: queueWaiting + queueWithDoctor,
        averageWaitTime: this.calculateEstimatedWaitTime(queueWaiting)
      },
      performance: {
        queueEfficiency: Math.round((queueCompleted / Math.max(queueCompleted + queueWaiting, 1)) * 100),
        appointmentCompletionRate: Math.round((completedAppointments / Math.max(todayAppointments, 1)) * 100),
        doctorUtilization: Math.round((activeDoctors / Math.max(totalDoctors, 1)) * 100),
        systemUptime: '99.9%'
      }
    };
  }

  async getRecentActivity() {
    // Get recent queue entries
    const recentQueue = await this.queueRepository.find({
      relations: ['patient'],
      order: { createdAt: 'DESC' },
      take: 8
    });

    // Get recent appointments
    const recentAppointments = await this.appointmentRepository.find({
      relations: ['patient', 'doctor'],
      order: { createdAt: 'DESC' },
      take: 5
    });

    return {
      recentQueueEntries: recentQueue.map(entry => ({
        id: entry.id,
        patientName: entry.patient.name,
        queueNumber: entry.queueNumber,
        status: entry.status,
        priority: entry.priority,
        time: entry.createdAt,
        estimatedWaitTime: this.calculateEstimatedWaitTimeForPosition(entry.queueNumber)
      })),
      recentAppointments: recentAppointments.map(apt => ({
        id: apt.id,
        patientName: apt.patient.name,
        doctorName: apt.doctor.name,
        appointmentTime: apt.appointmentDateTime,
        status: apt.status
      }))
    };
  }

  async getQueueAnalytics() {
    const hourlyData = await this.getHourlyQueueData();
    const statusDistribution = await this.getStatusDistribution();
    
    return {
      hourlyPatientFlow: hourlyData,
      statusDistribution,
      peakHours: this.identifyPeakHours(hourlyData)
    };
  }

  private calculateEstimatedWaitTime(waitingCount: number): string {
    const avgMinutes = waitingCount * 15; // 15 minutes per patient
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  private calculateEstimatedWaitTimeForPosition(queueNumber: number): string {
    const currentServing = 1; // Assume we're serving queue number 1
    const position = Math.max(queueNumber - currentServing, 0);
    return this.calculateEstimatedWaitTime(position);
  }

  private async getHourlyQueueData() {
    // Mock hourly data - in real implementation, you'd query actual data
    return [
      { hour: '9AM', patients: 12 },
      { hour: '10AM', patients: 18 },
      { hour: '11AM', patients: 25 },
      { hour: '12PM', patients: 15 },
      { hour: '1PM', patients: 8 },
      { hour: '2PM', patients: 22 },
      { hour: '3PM', patients: 20 },
      { hour: '4PM', patients: 16 }
    ];
  }

  private async getStatusDistribution() {
    const waiting = await this.queueRepository.count({ where: { status: 'waiting' } });
    const withDoctor = await this.queueRepository.count({ where: { status: 'with_doctor' } });
    const completed = await this.queueRepository.count({ where: { status: 'completed' } });
    
    return [
      { status: 'Waiting', count: waiting, color: '#fbbf24' },
      { status: 'With Doctor', count: withDoctor, color: '#3b82f6' },
      { status: 'Completed', count: completed, color: '#10b981' }
    ];
  }

  private identifyPeakHours(hourlyData: any[]): string[] {
    const avgPatients = hourlyData.reduce((sum, hour) => sum + hour.patients, 0) / hourlyData.length;
    return hourlyData
      .filter(hour => hour.patients > avgPatients)
      .map(hour => hour.hour);
  }
}
