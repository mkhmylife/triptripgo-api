import { Module } from '@nestjs/common';
import { HotelOpsService } from './hotel-ops.service';
import { PrismaServiceModule } from '../prisma-service/prisma-service.module';

@Module({
  imports: [PrismaServiceModule],
  providers: [HotelOpsService],
})
export class HotelOpsModule {}
