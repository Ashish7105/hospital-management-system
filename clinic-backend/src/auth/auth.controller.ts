import { Controller, Post, Body, HttpException, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    try {
      const { username, password } = body;
      if (!username || !password) {
        throw new HttpException('Username and password are required', HttpStatus.BAD_REQUEST);
      }
      
      return await this.authService.login(username, password);
    } catch (error) {
      throw new HttpException(
        error.message || 'Login failed',
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Post('register')
  async register(@Body() body: { username: string; password: string }) {
    try {
      const { username, password } = body;
      if (!username || !password) {
        throw new HttpException('Username and password are required', HttpStatus.BAD_REQUEST);
      }
      
      return await this.authService.register(username, password);
    } catch (error) {
      throw new HttpException(
        'Registration failed',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // NEW PROTECTED ROUTE FOR TOKEN TESTING
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req) {
    return {
      message: 'Token is valid!',
      user: req.user,
      tokenPayload: {
        userId: req.user.sub,
        username: req.user.username,
        role: req.user.role
      }
    };
  }
}
