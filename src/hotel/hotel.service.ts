import { Injectable } from '@nestjs/common';
import { GetHotelQuery } from './dto/GetHotelQuery';
import { PrismaService } from '../prisma-service/prisma-service.service';
import { Hotel, HotelPrice } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import * as moment from 'moment';
import { LogBody } from './dto/LogBody';
import { Moment } from 'moment';
import * as Airtable from 'airtable';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

interface HyperAirHotelPriceRes {
  id: number;
  minPrice: number;
}

@Injectable()
export class HotelService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // this.getHotelPrices().catch(console.error);
  }

  private static convertHotelToDto(hotel: Hotel & { prices: HotelPrice[] }) {
    let startDate: Moment;
    const dayINeed = 6; // for Sat
    const today = moment().isoWeekday();
    if (today < dayINeed) {
      startDate = moment().isoWeekday(dayINeed);
    } else {
      startDate = moment().add(1, 'weeks').isoWeekday(dayINeed);
    }

    const agodaUrl = hotel.agoda_id
      ? `https://www.agoda.com/partners/partnersearch.aspx?hid=${hotel.agoda_id}`
      : null;
    const tripUrl = hotel.trip_id
      ? `https://hk.trip.com/hotels/w/detail?hotelid=${
          hotel.trip_id
        }&Allianceid=3947837&SID=23572740&checkin=${startDate.format(
          'YYYY-MM-DD',
        )}&checkout=${startDate.clone().add(1, 'day').format('YYYY-MM-DD')}`
      : null;
    return {
      id: hotel.id,
      slug: hotel.slug,
      name: hotel.name,
      nameEn: hotel.nameEn,
      chainName: hotel.chainName,
      city: hotel.city,
      country: hotel.country,
      area: hotel.area,
      description: hotel.description,
      featuredImageUrl: hotel.photoUrl1,
      starRating: hotel.starRating,
      ratingAverage: hotel.ratingAverage,
      numberOfReviews: hotel.numberOfReviews,
      agodaUrl: `https://tp.media/r?marker=386575&trs=190278&p=2854&u=${encodeURIComponent(
        agodaUrl,
      )}&campaign_id=104`,
      tripUrl,
      tags: [],
      priceAgoda: hotel.prices[0]?.priceAgoda,
      priceTrip: hotel.prices[0]?.priceTrip,
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async _syncDatabase() {
    console.log('Sync Database');
    const airtable = new Airtable({
      apiKey: this.configService.get<string>('AIRTABLE_KEY'),
    });
    const records = await airtable
      .base('appDrweM8xSBkyNce')
      .table('Hotels')
      .select({
        maxRecords: 999999,
        view: 'Sync to DB',
      })
      .all();
    const getRecordValue = (record, colName: string) => {
      if (record.get(colName) && record.get(colName) !== '') {
        return record.get(colName);
      }
      return null;
    };

    for (const record of records) {
      try {
        await this.prismaService.hotel.update({
          where: {
            id: parseInt(record.get('id') as string),
          },
          data: {
            agoda_id: record.get('agodaId')
              ? Number(record.get('agodaId') as string)
              : null,
            trip_id: record.get('tripId')
              ? Number(record.get('tripId') as string)
              : null,
            chainName: getRecordValue(record, 'chainName'),
            nameEn: getRecordValue(record, 'nameEn'),
            name: getRecordValue(record, 'name'),
            city: getRecordValue(record, 'city'),
            country: getRecordValue(record, 'country'),
            zipcode: getRecordValue(record, 'zipcode'),
            area: getRecordValue(record, 'area'),
            starRating: (record.get('starRating') as number) || 0,
            latitude: String(record.get('starRating')) || '0',
            longitude: String(record.get('starRating')) || '0',
            yearOpened: getRecordValue(record, 'yearOpened'),
            photoUrl1: getRecordValue(record, 'photoUrl1'),
            photoUrl2: getRecordValue(record, 'photoUrl2'),
            photoUrl3: getRecordValue(record, 'photoUrl3'),
            photoUrl4: getRecordValue(record, 'photoUrl4'),
            photoUrl5: getRecordValue(record, 'photoUrl5'),
            description: getRecordValue(record, 'description'),
            numberOfReviews: (record.get('numberOfReviews') as number) || null,
            numberOfRooms: (record.get('numberOfRooms') as number) || null,
            ratingAverage: (record.get('ratingAverage') as number) || null,
          },
        });
      } catch (e) {
        console.error(e);
      }
    }
    console.log('Done Sync Database');
  }

  @Cron(CronExpression.EVERY_DAY_AT_5AM, { timeZone: 'Asia/Hong_Kong' })
  async _getHotelPrices() {
    const dates: string[] = [];
    for (let i = 6; i <= 30; i++) {
      const startDate = moment().add(i, 'days').format('YYYY-MM-DD');
      dates.push(startDate);
    }
    const hotels = await this.getHotels({});
    const length = hotels.length;
    let i = 0;
    for (const hotel of hotels) {
      i++;
      for (const date of dates) {
        try {
          const hotelPrice = await this.prismaService.hotelPrice.findFirst({
            where: {
              hotelId: hotel.id,
              date: moment(date).toDate(),
            },
          });
          if (!hotelPrice) {
            const prices = await this.getHotelPrice(hotel.id, date);
            if (
              (prices.agodaPrice && prices.agodaPrice > 0) ||
              (prices.tripPrice && prices.tripPrice > 0)
            ) {
              await this.prismaService.hotelPrice.create({
                data: {
                  date: moment(prices.startDate).toDate(),
                  priceAgoda:
                    prices.agodaPrice && prices.agodaPrice > 0
                      ? prices.agodaPrice
                      : null,
                  priceTrip:
                    prices.tripPrice && prices.tripPrice > 0
                      ? prices.tripPrice
                      : null,
                  hotel: {
                    connect: {
                      id: hotel.id,
                    },
                  },
                },
              });
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      console.log(`${((i / length) * 100).toFixed(2)}%`);
    }
  }

  async getHotels(query: GetHotelQuery) {
    const hotels = await this.prismaService.hotel.findMany({
      take: query.limit ? parseInt(query.limit) : 100,
      where: {
        numberOfReviews: {
          gt: 0,
        },
        chainName: query.chainName
          ? {
              contains: query.chainName,
            }
          : {
              not: null,
            },
        area: query.area ? query.area : undefined,
      },
      include: {
        prices: {
          take: 1,
          orderBy: [
            {
              priceAgoda: 'asc',
            },
            {
              priceTrip: 'asc',
            },
          ],
        },
      },
      orderBy: [
        {
          starRating: 'desc',
        },
        { ratingAverage: 'desc' },
        { numberOfReviews: 'desc' },
      ],
    });
    return hotels.map(HotelService.convertHotelToDto);
  }

  async getHotelPrice(id: number, startDate: string) {
    const endDate = moment(startDate).add(1, 'day').format('YYYY-MM-DD');
    const hotel = await this.prismaService.hotel.findUnique({
      where: {
        id,
      },
    });
    let tripPrice = 0;
    let agodaPrice = 0;
    if (hotel.agoda_id) {
      const res = await this.httpService
        .get<HyperAirHotelPriceRes[]>(
          `https://air.hyperair.com/hotel/price/agoda/${hotel.agoda_id}?startDate=${startDate}&endDate=${endDate}`,
        )
        .toPromise();
      if (res.data && res.data.length > 0) {
        agodaPrice = Math.round(res.data[0].minPrice);
      }
    }
    if (hotel.trip_id) {
      const res = await this.httpService
        .get<HyperAirHotelPriceRes[]>(
          `https://air.hyperair.com/hotel/price/trip/${hotel.trip_id}?startDate=${startDate}&endDate=${endDate}`,
        )
        .toPromise();
      if (res.data && res.data.length > 0) {
        tripPrice = Math.round(res.data[0].minPrice);
      }
    }
    return {
      agodaPrice,
      tripPrice,
      startDate,
      endDate,
    };
  }

  async log(payload: LogBody) {
    await this.prismaService.log.create({
      data: {
        name: payload.name,
        payload: payload.payload as any,
      },
    });
    return true;
  }
}
