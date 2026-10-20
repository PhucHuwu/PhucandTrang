import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { VersionsService } from './versions.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';

@Controller('versions')
export class VersionsController {
  constructor(private versionsService: VersionsService) {}

  @Get('book/:bookId')
  async findByBook(@Param('bookId') bookId: string) {
    return this.versionsService.findByBook(bookId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.versionsService.findOne(id);
  }

  @Post('book/:bookId/snapshot')
  async createSnapshot(
    @Param('bookId') bookId: string,
    @Body() body: CreateSnapshotDto,
    @Request() req: any,
  ) {
    return this.versionsService.createSnapshot(
      bookId,
      body.version,
      body.changelog,
      req.user?.id,
    );
  }

  @Roles(Role.ADMIN)
  @Post('book/:bookId/rollback/:versionId')
  async rollbackToSnapshot(
    @Param('bookId') bookId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versionsService.rollbackToSnapshot(bookId, versionId);
  }
}
