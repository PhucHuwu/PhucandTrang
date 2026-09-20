import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { VersionsService } from './versions.service';
import { AuthGuard } from '@nestjs/passport';

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

  @UseGuards(AuthGuard('jwt'))
  @Post('book/:bookId/snapshot')
  async createSnapshot(
    @Param('bookId') bookId: string,
    @Body() body: { version: string; changelog?: string },
    @Request() req: any
  ) {
    return this.versionsService.createSnapshot(bookId, body.version, body.changelog, req.user?.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('book/:bookId/rollback/:versionId')
  async rollbackToSnapshot(
    @Param('bookId') bookId: string,
    @Param('versionId') versionId: string
  ) {
    return this.versionsService.rollbackToSnapshot(bookId, versionId);
  }
}
