import { Module } from '@nestjs/common';
import { PuppeteerService } from './puppeteer-service.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [PuppeteerService],
  exports: [PuppeteerService],
})
export class PuppeteerServiceModule {}
