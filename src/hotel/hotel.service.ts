import { Injectable } from '@nestjs/common';
import { GetHotelQuery } from './dto/GetHotelQuery';
import { PrismaService } from '../prisma-service/prisma-service.service';
import {
  Hotel,
  HotelCheckPointMetroGuide,
  HotelPrice,
  HotelToPlaceDistance,
  Place,
} from '@prisma/client';
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

type HotelToPlaceDistanceWithPlace = HotelToPlaceDistance & {
  place: Place;
};

@Injectable()
export class HotelService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // this.getHotelPrices().catch(console.error);
  }

  private static convertHotelPlaceToDto(hp: HotelToPlaceDistanceWithPlace) {
    return {
      id: hp.place.id,
      name: hp.place.name,
      distance: hp.distance,
      group: hp.place.group,
    };
  }

  private static convertHotelToDto(
    hotel: Hotel & {
      prices: HotelPrice[];
      nearestCheckPoint?: HotelToPlaceDistanceWithPlace;
      nearestMetroStation?: HotelToPlaceDistanceWithPlace;
      places: HotelToPlaceDistanceWithPlace[];
      checkPointMetroGuides: (HotelCheckPointMetroGuide & {
        checkPoint: Place;
      })[];
    },
  ) {
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
      // description: hotel.description,
      featuredImageUrl: hotel.photoUrl1,
      imageUrls: [
        hotel.photoUrl1,
        hotel.photoUrl2,
        hotel.photoUrl3,
        hotel.photoUrl4,
        hotel.photoUrl5,
      ]
        .filter((url) => url && url !== '')
        .map((url) => url.replace('http://', 'https://')),
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
      latitude: Number(hotel.latitude),
      longitude: Number(hotel.longitude),
      nearestCheckPoint: hotel.nearestCheckPoint
        ? HotelService.convertHotelPlaceToDto(hotel.nearestCheckPoint)
        : undefined,
      nearestMetroStation: hotel.nearestMetroStation
        ? HotelService.convertHotelPlaceToDto(hotel.nearestMetroStation)
        : undefined,
      places: hotel.places.map(HotelService.convertHotelPlaceToDto),
      checkPointMetroGuide: hotel.checkPointMetroGuides
        .map((guide) => {
          return {
            id: guide.id,
            checkPoint: guide.checkPoint.name,
            routes: (guide.guide as any).map((route) => {
              return {
                departureStop: route.departureStop,
                arrivalStop: route.arrivalStop,
                lineNumber: route.lineNumber,
                numberOfStops: route.numberOfStops,
                duration: route.duration,
              };
            }),
            totalDuration: (guide.guide as any).reduce(
              (acc, route) => acc + route.duration,
              0,
            ),
            totalNumberOfStops: (guide.guide as any).reduce(
              (acc, route) => acc + route.numberOfStops,
              0,
            ),
          };
        })
        .filter((guide) => guide.totalDuration > 0)
        .sort((a, b) => a.totalDuration - b.totalDuration),
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
            latitude: String(record.get('latitude')) || '0',
            longitude: String(record.get('longitude')) || '0',
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

    const recordsPlaces = await airtable
      .base('appDrweM8xSBkyNce')
      .table('Places')
      .select({
        maxRecords: 999999,
      })
      .all();
    for (const record of recordsPlaces) {
      await this.prismaService.place.upsert({
        where: {
          name: getRecordValue(record, 'name'),
        },
        update: {
          latitude: getRecordValue(record, 'latitude').toString(),
          longitude: getRecordValue(record, 'longitude').toString(),
          group: getRecordValue(record, 'group') || '景點',
        },
        create: {
          name: getRecordValue(record, 'name'),
          latitude: getRecordValue(record, 'latitude').toString(),
          longitude: getRecordValue(record, 'longitude').toString(),
          group: getRecordValue(record, 'group') || '景點',
        },
      });
    }

    const calcDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ) => {
      const radlat1 = (Math.PI * lat1) / 180;
      const radlat2 = (Math.PI * lat2) / 180;
      const theta = lon1 - lon2;
      const radtheta = (Math.PI * theta) / 180;
      let dist =
        Math.sin(radlat1) * Math.sin(radlat2) +
        Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      dist = Math.acos(dist);
      dist = (dist * 180) / Math.PI;
      dist = dist * 60 * 1.1515;
      return dist * 1.609344;
    };

    const places = await this.prismaService.place.findMany();
    const hotels = await this.prismaService.hotel.findMany({
      where: {
        starRating: {
          gte: 3,
        },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        nearestMetroStationId: true,
        nearestCheckPointId: true,
        places: {
          select: {
            place: true,
          },
        },
      },
    });
    for (const hotel of hotels) {
      for (const place of places) {
        const existingPlace = hotel.places.find(
          (p) => p.place.name === place.name,
        );
        if (!existingPlace) {
          const distance = calcDistance(
            Number(hotel.latitude),
            Number(hotel.longitude),
            Number(place.latitude),
            Number(place.longitude),
          );
          await this.prismaService.hotelToPlaceDistance.create({
            data: {
              hotel: {
                connect: {
                  id: hotel.id,
                },
              },
              place: {
                connect: {
                  id: place.id,
                },
              },
              distance,
            },
          });
        }
      }
    }

    for (const hotel of hotels) {
      const nearestCheckPoint = hotel.nearestCheckPointId;
      if (!nearestCheckPoint) {
        const checkPoints = places
          .filter((p) => p.group === '口岸')
          .map((p) => {
            const distance = calcDistance(
              Number(hotel.latitude),
              Number(hotel.longitude),
              Number(p.latitude),
              Number(p.longitude),
            );
            return { ...p, ...{ distance } };
          })
          .sort((a, b) => a.distance - b.distance);
        await this.prismaService.hotel.update({
          where: {
            id: hotel.id,
          },
          data: {
            nearestCheckPoint: {
              connect: {
                hotelId_placeId: {
                  hotelId: hotel.id,
                  placeId: checkPoints[0].id,
                },
              },
            },
          },
        });
      }

      const nearestMetroStation = hotel.nearestMetroStationId;
      if (!nearestMetroStation) {
        const metroStations = places
          .filter((p) => p.group === '地鐵站')
          .map((p) => {
            const distance = calcDistance(
              Number(hotel.latitude),
              Number(hotel.longitude),
              Number(p.latitude),
              Number(p.longitude),
            );
            return { ...p, ...{ distance } };
          })
          .sort((a, b) => a.distance - b.distance);
        await this.prismaService.hotel.update({
          where: {
            id: hotel.id,
          },
          data: {
            nearestMetroStation: {
              connect: {
                hotelId_placeId: {
                  hotelId: hotel.id,
                  placeId: metroStations[0].id,
                },
              },
            },
          },
        });
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
          if (
            !hotelPrice ||
            (hotel.tripUrl && !hotelPrice.priceTrip) ||
            (hotel.agodaUrl && !hotelPrice.priceAgoda)
          ) {
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
        nearestCheckPointId: {
          not: null,
        },
        nearestMetroStationId: {
          not: null,
        },
        places: query.nearby
          ? {
              some: {
                distance: {
                  lte: 2,
                },
                place: {
                  group: query.nearby,
                },
              },
            }
          : undefined,
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
        nearestCheckPoint: {
          include: {
            place: true,
          },
        },
        nearestMetroStation: {
          include: {
            place: true,
          },
        },
        places: {
          where: {
            place: {
              group: {
                notIn: ['口岸', '地鐵站'],
              },
            },
          },
          include: {
            place: true,
          },
          take: 2,
          orderBy: {
            distance: 'asc',
          },
        },
        checkPointMetroGuides: {
          include: {
            checkPoint: true,
          },
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
}
