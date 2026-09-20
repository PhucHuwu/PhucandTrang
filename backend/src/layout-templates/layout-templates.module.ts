import { Module } from '@nestjs/common';
import { LayoutTemplatesService } from './layout-templates.service';
import { LayoutTemplatesController } from './layout-templates.controller';

@Module({
  controllers: [LayoutTemplatesController],
  providers: [LayoutTemplatesService],
  exports: [LayoutTemplatesService],
})
export class LayoutTemplatesModule {}
