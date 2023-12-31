import { Test, TestingModule } from '@nestjs/testing';
import { HotelOpsService } from './hotel-ops.service';
import { PrismaServiceModule } from '../prisma-service/prisma-service.module';

describe('HotelOpsService', () => {
  let service: HotelOpsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaServiceModule],
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
});
