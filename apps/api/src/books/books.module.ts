import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { JournalController } from './journal.controller';
import { PublishValidationService } from './publish-validation.service';

@Module({
  controllers: [JournalController],
  providers: [BooksService, PublishValidationService],
  exports: [BooksService, PublishValidationService],
})
export class BooksModule {}
