import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HotelModule } from './hotel/hotel.module';
import { HotelOpsModule } from './hotel-ops/hotel-ops.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HotelModule,
    HotelOpsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
