import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AudioService } from './audio.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateAudioTrackDto } from './dto/create-audio-track.dto';
import { UpdateAudioTrackDto } from './dto/update-audio-track.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('audio')
export class AudioController {
  constructor(private audioService: AudioService) {}

  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @Get()
  async findAll() {
    return this.audioService.findAll();
  }

  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.audioService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  async create(@Body() dto: CreateAudioTrackDto) {
    return this.audioService.create(dto);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAudioTrackDto,
  ) {
    return this.audioService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.audioService.remove(id);
  }
}
