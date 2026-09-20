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

@Controller('audio')
export class AudioController {
  constructor(private audioService: AudioService) {}

  @Get()
  async findAll() {
    return this.audioService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.audioService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  async create(@Body() dto: CreateAudioTrackDto) {
    return this.audioService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAudioTrackDto,
  ) {
    return this.audioService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.audioService.remove(id);
  }
}
