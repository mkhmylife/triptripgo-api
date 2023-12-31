import { Module } from '@nestjs/common';
import { HotelService } from './hotel.service';
import { HotelController } from './hotel.controller';
import { PrismaServiceModule } from '../prisma-service/prisma-service.module';

@Module({
  imports: [PrismaServiceModule],
  providers: [HotelService],
  controllers: [HotelController],
})
export class HotelModule {}
