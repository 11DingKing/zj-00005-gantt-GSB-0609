import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Milestones')
@Controller('milestones')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all milestones for a project' })
  findAll(@Request() req, @Query('projectId') projectId: string) {
    return this.milestonesService.findAll(req.user.userId, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get milestone by ID' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.milestonesService.findOne(req.user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new milestone' })
  create(@Request() req, @Body() createMilestoneDto: CreateMilestoneDto) {
    return this.milestonesService.create(req.user.userId, createMilestoneDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update milestone' })
  update(@Request() req, @Param('id') id: string, @Body() updateMilestoneDto: UpdateMilestoneDto) {
    return this.milestonesService.update(req.user.userId, id, updateMilestoneDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete milestone' })
  remove(@Request() req, @Param('id') id: string) {
    return this.milestonesService.remove(req.user.userId, id);
  }
}
