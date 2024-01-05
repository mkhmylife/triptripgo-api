import { IsNotEmpty } from 'class-validator';

export class LogBody {
  @IsNotEmpty()
  name: string;

  payload?: JSON;
}
