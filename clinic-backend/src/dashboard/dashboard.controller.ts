import { 
  Controller, 
  Get,
  HttpException,
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // GET /dashboard/stats - Get comprehensive dashboard statistics
  @Get('stats')
  async getDashboardStats() {
    try {
      return await this.dashboardService.getDashboardStats();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch dashboard statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // GET /dashboard/activity - Get recent activity feed
  @Get('activity')
  async getRecentActivity() {
    try {
      return await this.dashboardService.getRecentActivity();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch recent activity',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // GET /dashboard/analytics - Get queue analytics and insights
  @Get('analytics')
  async getQueueAnalytics() {
    try {
      return await this.dashboardService.getQueueAnalytics();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch queue analytics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // GET /dashboard/summary - Get quick summary for mobile/widgets
  @Get('summary')
  async getQuickSummary() {
    try {
      const stats = await this.dashboardService.getDashboardStats();
      return {
        patientsWaiting: stats.queueStats.waiting,
        urgentCases: stats.queueStats.urgent,
        activeDoctors: stats.todayStats.activeDoctors,
        todayAppointments: stats.todayStats.appointments,
        systemStatus: stats.overview.systemStatus
      };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch dashboard summary',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
