// src/main.ts
import { ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 🔧 ENHANCED: Specific CORS with detailed error messages
  app.enableCors({
    origin: ['http://localhost:3000', 'http://192.168.1.6:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // 🔧 CRITICAL: Enhanced validation pipe with detailed error messages
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      const messages = errors.map((error) => ({
        field: error.property,
        value: error.value,
        messages: Object.values(error.constraints || {}),
      }));
      
      return new HttpException({
        success: false,
        message: 'Validation failed',
        statusCode: 400,
        errors: messages
      }, HttpStatus.BAD_REQUEST);
    }
  }));

  await app.listen(3001);
  console.log('Backend running on: http://localhost:3001');
  console.log('CORS enabled for: http://localhost:3000');
}
bootstrap();
