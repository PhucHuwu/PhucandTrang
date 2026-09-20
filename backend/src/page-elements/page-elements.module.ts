import { Module } from '@nestjs/common';
import { PageElementsService } from './page-elements.service';
import { PageElementsController } from './page-elements.controller';

@Module({
  controllers: [PageElementsController],
  providers: [PageElementsService],
  exports: [PageElementsService],
})
export class PageElementsModule {}
