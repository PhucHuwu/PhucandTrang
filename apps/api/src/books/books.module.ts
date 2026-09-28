import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { JournalController } from './journal.controller';
import { PublishValidationService } from './publish-validation.service';

@Module({
  controllers: [JournalController, BooksController],
  providers: [BooksService, PublishValidationService],
  exports: [BooksService, PublishValidationService],
})
export class BooksModule {}
