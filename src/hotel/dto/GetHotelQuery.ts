import { IsOptional } from 'class-validator';

export class GetHotelQuery {
  @IsOptional()
  city?: string;

  @IsOptional()
  area?: string;

  @IsOptional()
  chainName?: string;

  @IsOptional()
  nearby?: string;

  @IsOptional()
  limit?: string;
}
