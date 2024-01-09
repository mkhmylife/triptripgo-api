import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma-service.service';
import { HotelService } from '../hotel/hotel.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as process from 'process';

@Injectable()
export class HotelOpsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hotelService: HotelService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

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

  async getTravelGuideFromCheckPoints() {
    const key = this.configService.get('AMAP_WEB_KEY');
    const hotels = await this.hotelService.getHotels({});
    const checkPoints = await this.prismaService.place.findMany({
      where: {
        group: '口岸',
        name: {
          in: ['福田口岸', '羅湖口岸', '蓮塘口岸', '深圳灣口岸'],
        },
      },
    });
    for (const hotel of hotels) {
      for (const place of checkPoints) {
        const existingGuide =
          await this.prismaService.hotelCheckPointMetroGuide.findFirst({
            where: {
              hotelId: hotel.id,
              placeId: place.id,
            },
          });
        if (existingGuide) {
          continue;
        }
        try {
          const { data } = await this.httpService
            .get(
              `https://restapi.amap.com/v3/direction/transit/integrated?key=${key}&origin=${place.longitude},${place.latitude}&destination=${hotel.longitude},${hotel.latitude}&city=深圳&cityd=&strategy=0&nightflag=0&date=2014-3-19&time=12:30`,
            )
            .toPromise();
          const routes = [];
          const segments = data.route.transits[0].segments;
          for (const segment of segments) {
            if (segment.bus) {
              const buslines = segment.bus.buslines;
              for (const busline of buslines) {
                if (busline.type === '地铁线路' && busline.name) {
                  const departureStop = busline.departure_stop.name;
                  const arrivalStop = busline.arrival_stop.name;
                  const lineName = busline.name;
                  const lineNumber = Number(
                    busline.name.match(/地铁(\d|\d\d)号线/)[1],
                  );
                  const numberOfStops = Number(busline.via_num) + 1;
                  const duration = Number(busline.duration);
                  routes.push({
                    departureStop,
                    arrivalStop,
                    lineName,
                    lineNumber,
                    numberOfStops,
                    duration,
                  });
                }
              }
            }
          }
          await this.prismaService.hotelCheckPointMetroGuide.create({
            data: {
              hotel: {
                connect: {
                  id: hotel.id,
                },
              },
              checkPoint: {
                connect: {
                  id: place.id,
                },
              },
              guide: routes,
            },
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
}
