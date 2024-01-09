import { Test, TestingModule } from '@nestjs/testing';
import { HotelOpsService } from './hotel-ops.service';
import { PrismaServiceModule } from '../prisma-service/prisma-service.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { HotelModule } from '../hotel/hotel.module';
import { CacheModule } from '@nestjs/cache-manager';

describe('HotelOpsService', () => {
  let service: HotelOpsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true }),
        PrismaServiceModule,
        HttpModule,
        ConfigModule.forRoot({ isGlobal: true }),
        HotelModule,
      ],
      providers: [HotelOpsService],
    }).compile();

    service = module.get<HotelOpsService>(HotelOpsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fix agoda photo', async () => {
    await service.fixAgodaImage();
  }, 9999999);

  it('should get travel guide from checkpoint', async () => {
    await service.getTravelGuideFromCheckPoints();
  }, 9999999);
});
