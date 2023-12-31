import { IsOptional } from 'class-validator';

export class GetHotelQuery {
  @IsOptional()
  city?: string;

  @IsOptional()
  area?: string;

  @IsOptional()
  ranking?: string;

  @IsOptional()
  limit?: string;
}
