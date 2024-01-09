import { Controller, Get, Param } from '@nestjs/common';
import { BlogService } from './blog.service';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('/:id')
  async article(@Param('id') id: string) {
    const idStr = id.split('-');
    return await this.blogService.getBlogArticle(Number(idStr[0]));
  }
}
