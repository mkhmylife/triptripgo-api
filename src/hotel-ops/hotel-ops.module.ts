import { Module } from '@nestjs/common';
import { HotelOpsService } from './hotel-ops.service';
import { PrismaServiceModule } from '../prisma-service/prisma-service.module';
import { HotelModule } from '../hotel/hotel.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [PrismaServiceModule, HotelModule, HttpModule],
  providers: [HotelOpsService],
})
export class HotelOpsModule {}
