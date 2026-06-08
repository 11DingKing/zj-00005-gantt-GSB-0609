import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VersionsService } from './versions.service';
import { CreateVersionDto, UpdateVersionDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Versions')
@Controller('versions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all versions for a project' })
  findAll(@Request() req, @Query('projectId') projectId: string) {
    return this.versionsService.findAll(req.user.userId, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get version by ID' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.versionsService.findOne(req.user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new version' })
  create(@Request() req, @Body() createVersionDto: CreateVersionDto) {
    return this.versionsService.create(req.user.userId, createVersionDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update version' })
  update(@Request() req, @Param('id') id: string, @Body() updateVersionDto: UpdateVersionDto) {
    return this.versionsService.update(req.user.userId, id, updateVersionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete version' })
  remove(@Request() req, @Param('id') id: string) {
    return this.versionsService.remove(req.user.userId, id);
  }
}
