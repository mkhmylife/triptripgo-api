import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { HttpModule } from '@nestjs/axios';
import { BlogController } from './blog.controller';

@Module({
  imports: [HttpModule],
  providers: [BlogService],
  controllers: [BlogController],
})
export class BlogModule {}
