import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Request() req,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAll(req.user.userId, search, limit ? parseInt(limit) : 20);
  }

  @Get('search-by-project')
  @ApiOperation({ summary: 'Search users not in a project (for inviting)' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false })
  searchByProject(
    @Request() req,
    @Query('projectId') projectId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.searchByProject(req.user.userId, projectId, search, limit ? parseInt(limit) : 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.usersService.findOne(req.user.userId, id);
  }
}
