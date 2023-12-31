import { Injectable } from '@nestjs/common';
import { GetHotelQuery } from './dto/GetHotelQuery';
import { PrismaService } from '../prisma-service/prisma-service.service';
import { Hotel } from '@prisma/client';

@Injectable()
export class HotelService {
  constructor(private readonly prismaService: PrismaService) {}

  private static convertHotelToDto(hotel: Hotel) {
    const agodaUrl = hotel.agoda_id
      ? `https://www.agoda.com/partners/partnersearch.aspx?hid=${hotel.agoda_id}`
      : null;
    const tripUrl = hotel.trip_id
      ? `https://hk.trip.com/hotels/w/detail?hotelid=${hotel.trip_id}&Allianceid=3947837&SID=23572740`
      : null;
    return {
      id: hotel.id,
      slug: hotel.slug,
      name: hotel.name,
      nameEn: hotel.nameEn,
      city: hotel.city,
      country: hotel.country,
      featuredImageUrl: hotel.photoUrl1,
      starRating: hotel.starRating,
      ratingAverage: hotel.ratingAverage,
      numberOfReviews: hotel.numberOfReviews,
      agodaUrl: `https://tp.media/r?marker=386575&trs=190278&p=2854&u=${encodeURIComponent(
        agodaUrl,
      )}&campaign_id=104`,
      tripUrl,
      tags: [],
      price: 0,
    };
  }

  async getHotels(query: GetHotelQuery) {
    const hotels = await this.prismaService.hotel.findMany({
      take: query.limit ? parseInt(query.limit) : 100,
      where: {
        numberOfReviews: {
          gt: 0,
        },
      },
      orderBy: [
        {
          starRating: 'desc',
        },
        { numberOfReviews: 'desc' },
      ],
    });
    return hotels.map(HotelService.convertHotelToDto);
  }
}
