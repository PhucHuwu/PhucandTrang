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

  @Post()
  async create(@Body() dto: CreateAudioTrackDto) {
    return this.audioService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAudioTrackDto,
  ) {
    return this.audioService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.audioService.remove(id);
  }
}
