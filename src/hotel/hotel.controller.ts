import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { HotelService } from './hotel.service';
import { GetHotelQuery } from './dto/GetHotelQuery';
import { LogBody } from './dto/LogBody';
import * as moment from 'moment/moment';
import { CacheInterceptor } from '../cacheInterceptor';

@Controller('hotel')
@UseInterceptors(CacheInterceptor)
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  @Get('_/sync')
  async syncHotels() {
    this.hotelService._syncDatabase().catch(console.error);
    return 'okay';
  }

  @Get('')
  async getHotels(@Query() query: GetHotelQuery) {
    return await this.hotelService.getHotels(query);
  }

  @Get('/price/:id')
  async getHotelPrice(@Param('id', ParseIntPipe) id: number) {
    const startDate = moment().add(7, 'days').format('YYYY-MM-DD');
    return await this.hotelService.getHotelPrice(id, startDate);
  }

  @Post('/l')
  async log(@Body() payload: LogBody) {
    return await this.hotelService.log(payload);
  }
}
