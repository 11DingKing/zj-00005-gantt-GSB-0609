import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.workspace.findMany({
      where: { ownerId: userId },
      include: {
        owner: { select: { id: true, name: true, username: true } },
        _count: { select: { projects: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, username: true, email: true } },
        projects: {
          include: {
            _count: { select: { members: true, tasks: true } },
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    return workspace;
  }

  async create(userId: string, createWorkspaceDto: CreateWorkspaceDto) {
    return this.prisma.workspace.create({
      data: {
        name: createWorkspaceDto.name,
        ownerId: userId,
      },
      include: {
        owner: { select: { id: true, name: true, username: true } },
      },
    });
  }

  async update(userId: string, id: string, updateWorkspaceDto: UpdateWorkspaceDto) {
    const existingWorkspace = await this.prisma.workspace.findUnique({
      where: { id },
    });

    if (!existingWorkspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (existingWorkspace.ownerId !== userId) {
      throw new ForbiddenException('Only workspace owners can update workspaces');
    }

    return this.prisma.workspace.update({
      where: { id },
      data: updateWorkspaceDto,
      include: {
        owner: { select: { id: true, name: true, username: true } },
      },
    });
  }

  async remove(userId: string, id: string) {
    const existingWorkspace = await this.prisma.workspace.findUnique({
      where: { id },
    });

    if (!existingWorkspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (existingWorkspace.ownerId !== userId) {
      throw new ForbiddenException('Only workspace owners can delete workspaces');
    }

    await this.prisma.workspace.delete({ where: { id } });

    return { message: 'Workspace deleted successfully' };
  }
}
