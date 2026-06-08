import { Controller, Post, Body, Delete, Param, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DependenciesService } from './dependencies.service';
import { CreateDependencyDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Dependencies')
@Controller('dependencies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DependenciesController {
  constructor(private readonly dependenciesService: DependenciesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all dependencies for a project' })
  findByProject(@Request() req, @Query('projectId') projectId: string) {
    return this.dependenciesService.findByProject(req.user.userId, projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Create task dependency' })
  create(@Request() req, @Body() createDependencyDto: CreateDependencyDto) {
    return this.dependenciesService.create(req.user.userId, createDependencyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task dependency' })
  remove(@Request() req, @Param('id') id: string) {
    return this.dependenciesService.remove(req.user.userId, id);
  }
}
