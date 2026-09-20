import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { SignedUploadRequestDto } from './dto/signed-upload.dto';

@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  /**
   * Request signed upload config for direct client upload to Cloudinary.
   * Admin uses this to upload large images, videos, audio without passing files through NestJS.
   */
  @Post('signature')
  getSignedUploadConfigPost(@Body() dto: SignedUploadRequestDto) {
    return this.mediaService.getSignedUploadConfig(dto);
  }

  @Get('signature')
  getSignedUploadConfigGet(@Query() dto: SignedUploadRequestDto) {
    return this.mediaService.getSignedUploadConfig(dto);
  }

  /**
   * Look up media by filename (e.g., '02-01-2025.jpg') or partial URL.
   * Useful for migrating legacy hardcoded media references to DB records.
   */
  @Get('lookup')
  lookup(@Query('q') query: string) {
    return this.mediaService.lookup(query);
  }

  /**
   * Sync legacy cloudinaryUrls.json map into the database.
   */
  @Post('sync-legacy')
  syncLegacy(@Body() legacyMap: Record<string, string>) {
    return this.mediaService.syncLegacyMedia(legacyMap);
  }

  /**
   * List media items with pagination, filtering by type/provider, and text search.
   */
  @Get()
  findAll(@Query() query: QueryMediaDto) {
    return this.mediaService.findAll(query);
  }

  /**
   * Get single media details by ID.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  /**
   * Inspect all references in books, pages, elements, and audio tracks where this media is used.
   */
  @Get(':id/references')
  checkReferences(@Param('id') id: string) {
    return this.mediaService.checkReferences(id);
  }

  /**
   * Save media metadata after successful direct upload to Cloudinary.
   */
  @Post()
  create(@Body() dto: CreateMediaDto) {
    return this.mediaService.create(dto);
  }

  /**
   * Update media metadata (alt, type, width, height, custom metadata).
   */
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.update(id, dto);
  }

  /**
   * Safely deletes media.
   * If media is in use by any page, element, cover, or audio track, halts deletion
   * and returns 409 Conflict with full references list.
   * Pass ?force=true to override and delete regardless of references.
   */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    const isForce = force === 'true' || force === '1';
    return this.mediaService.remove(id, isForce);
  }
}
