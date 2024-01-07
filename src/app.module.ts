import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HotelModule } from './hotel/hotel.module';
import { HotelOpsModule } from './hotel-ops/hotel-ops.module';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({
      isGlobal: true,
    }),
    HotelModule,
    HotelOpsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
