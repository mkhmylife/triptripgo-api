import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HotelModule } from './hotel/hotel.module';
import { HotelOpsModule } from './hotel-ops/hotel-ops.module';

@Module({
  imports: [HotelModule, HotelOpsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
