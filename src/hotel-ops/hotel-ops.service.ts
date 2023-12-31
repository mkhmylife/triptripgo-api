import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma-service.service';

@Injectable()
export class HotelOpsService {
  constructor(private readonly prismaService: PrismaService) {}

  async fixAgodaImage() {
    const hotels = await this.prismaService.hotel.findMany();
    for (const hotel of hotels) {
      try {
        const url = new URL(hotel.photoUrl1);
        await this.prismaService.hotel.update({
          where: {
            id: hotel.id,
          },
          data: {
            photoUrl1: `https://${url.host}${url.pathname}`,
          },
        });
      } catch (e) {}
    }
    console.log('Done');
  }
}
