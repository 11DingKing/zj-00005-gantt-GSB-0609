import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto, AcceptInvitationDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Invitations')
@Controller('invitations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get pending invitations for a project' })
  findAll(@Request() req, @Query('projectId') projectId: string) {
    return this.invitationsService.findAll(req.user.userId, projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new invitation' })
  create(@Request() req, @Body() createInvitationDto: CreateInvitationDto) {
    return this.invitationsService.create(req.user.userId, createInvitationDto);
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept invitation by token' })
  accept(@Request() req, @Body() acceptInvitationDto: AcceptInvitationDto) {
    return this.invitationsService.accept(req.user.userId, acceptInvitationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel invitation' })
  remove(@Request() req, @Param('id') id: string) {
    return this.invitationsService.remove(req.user.userId, id);
  }
}
