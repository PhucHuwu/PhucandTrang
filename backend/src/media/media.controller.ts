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
} from '@nestjs/common';
import { MediaService } from './media.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { SignedUploadRequestDto } from './dto/signed-upload.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  /**
   * Request signed upload config for direct client upload to Cloudinary.
   * Admin/Editor authentication is strictly required.
   */
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('signature')
  getSignedUploadConfigPost(@Body() dto: SignedUploadRequestDto) {
    return this.mediaService.getSignedUploadConfig(dto);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Get('signature')
  getSignedUploadConfigGet(@Query() dto: SignedUploadRequestDto) {
    return this.mediaService.getSignedUploadConfig(dto);
  }

  /**
   * Look up media by filename (e.g., '02-01-2025.jpg') or partial URL.
   */
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @Get('lookup')
  lookup(@Query('q') query: string) {
    return this.mediaService.lookup(query);
  }

  /**
   * Sync legacy cloudinaryUrls.json map into the database.
   */
  @Roles(Role.ADMIN)
  @Post('sync-legacy')
  syncLegacy(@Body() legacyMap: Record<string, string>) {
    return this.mediaService.syncLegacyMedia(legacyMap);
  }

  /**
   * List media items with pagination, filtering by type/provider, and text search.
   */
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @Get()
  findAll(@Query() query: QueryMediaDto) {
    return this.mediaService.findAll(query);
  }

  /**
   * Get single media details by ID.
   */
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  /**
   * Inspect all references in books, pages, elements, and audio tracks where this media is used.
   */
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @Get(':id/references')
  checkReferences(@Param('id') id: string) {
    return this.mediaService.checkReferences(id);
  }

  /**
   * Save media metadata after successful direct upload to Cloudinary.
   */
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  create(@Body() dto: CreateMediaDto) {
    return this.mediaService.create(dto);
  }

  /**
   * Update media metadata.
   */
  @Roles(Role.ADMIN, Role.EDITOR)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.update(id, dto);
  }

  /**
   * Safely deletes media.
   * If media is in use, rejects with 409 Conflict unless force=true.
   */
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    const isForce = force === 'true' || force === '1';
    return this.mediaService.remove(id, isForce);
  }
}
