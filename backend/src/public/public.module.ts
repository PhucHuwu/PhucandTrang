import { Module, Global } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { PublicCacheService } from './public-cache.service';

@Global()
@Module({
  controllers: [PublicController],
  providers: [PublicService, PublicCacheService],
  exports: [PublicService, PublicCacheService],
})
export class PublicModule {}
