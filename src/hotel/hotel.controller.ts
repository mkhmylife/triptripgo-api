import { Controller, Get, Query } from '@nestjs/common';
import { HotelService } from './hotel.service';
import { GetHotelQuery } from './dto/GetHotelQuery';

@Controller('hotel')
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  @Get('')
  async getHotels(@Query() query: GetHotelQuery) {
    return await this.hotelService.getHotels(query);
  }
}
