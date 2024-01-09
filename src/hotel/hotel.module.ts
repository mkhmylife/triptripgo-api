import { Module } from '@nestjs/common';
import { HotelService } from './hotel.service';
import { HotelController } from './hotel.controller';
import { PrismaServiceModule } from '../prisma-service/prisma-service.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [PrismaServiceModule, HttpModule],
  providers: [HotelService],
  controllers: [HotelController],
  exports: [HotelService],
})
export class HotelModule {}
