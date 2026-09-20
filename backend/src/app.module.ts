import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { PagesModule } from './pages/pages.module';
import { PageElementsModule } from './page-elements/page-elements.module';
import { LayoutTemplatesModule } from './layout-templates/layout-templates.module';
import { MediaModule } from './media/media.module';
import { AudioModule } from './audio/audio.module';
import { VersionsModule } from './versions/versions.module';
import { PublicModule } from './public/public.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    BooksModule,
    PagesModule,
    PageElementsModule,
    LayoutTemplatesModule,
    MediaModule,
    AudioModule,
    VersionsModule,
    PublicModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
