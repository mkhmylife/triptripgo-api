import { Test, TestingModule } from '@nestjs/testing';
import { HotelService } from './hotel.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrismaServiceModule } from '../prisma-service/prisma-service.module';

describe('HotelService', () => {
  let service: HotelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        HttpModule,
        PrismaServiceModule,
      ],
      providers: [HotelService],
    }).compile();

    service = module.get<HotelService>(HotelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get hotel price', async () => {
    const prices = await service.getHotelPrice(2874, '2024-01-30');
    console.log(prices);
  }, 9999999);

  it('should sync database', async () => {
    await service._syncDatabase();
  }, 9999999);

  it('should get prices', async () => {
    await service._getHotelPrices();
  }, 9999999);
});
