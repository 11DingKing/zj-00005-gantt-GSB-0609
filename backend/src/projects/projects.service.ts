import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { Role } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, workspaceId: string, cursor?: string, limit: number = 20) {
    const where: any = {
      workspaceId,
      members: { some: { userId } },
    };

    if (cursor) {
      where.id = { gt: cursor };
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, username: true } },
        _count: { select: { members: true, tasks: true, milestones: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = projects.length > limit;
    const resultProjects = hasMore ? projects.slice(0, -1) : projects;

    return {
      projects: resultProjects,
      cursor: hasMore ? resultProjects[resultProjects.length - 1].id : null,
      hasMore,
    };
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, username: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, email: true } },
          },
        },
        workspace: { select: { id: true, name: true } },
        _count: { select: { tasks: true, milestones: true, versions: true } },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const member = project.members.find((m) => m.userId === userId);
    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return {
      ...project,
      myRole: member.role,
    };
  }

  async create(userId: string, createProjectDto: CreateProjectDto) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: createProjectDto.workspaceId },
    });

    if (!workspace || workspace.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to create projects in this workspace');
    }

    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
        workspaceId: createProjectDto.workspaceId,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: Role.OWNER,
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true, username: true } },
      },
    });

    return project;
  }

  async update(userId: string, id: string, updateProjectDto: UpdateProjectDto) {
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    const member = existingProject.members.find((m) => m.userId === userId);
    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }

    if (member.role !== Role.OWNER && member.role !== Role.ADMIN) {
      throw new ForbiddenException('Only owners and admins can update projects');
    }

    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      include: {
        owner: { select: { id: true, name: true, username: true } },
      },
    });
  }

  async remove(userId: string, id: string) {
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    const member = existingProject.members.find((m) => m.userId === userId);
    if (!member || member.role !== Role.OWNER) {
      throw new ForbiddenException('Only project owners can delete projects');
    }

    await this.prisma.project.delete({ where: { id } });

    return { message: 'Project deleted successfully' };
  }

  async updateMemberRole(userId: string, projectId: string, memberId: string, role: Role) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const currentUserMember = project.members.find((m) => m.userId === userId);
    if (!currentUserMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    if (currentUserMember.role !== Role.OWNER && currentUserMember.role !== Role.ADMIN) {
      throw new ForbiddenException('Only owners and admins can manage member roles');
    }

    const targetMember = project.members.find((m) => m.id === memberId);
    if (!targetMember) {
      throw new NotFoundException('Member not found in project');
    }

    if (targetMember.role === Role.OWNER && currentUserMember.role !== Role.OWNER) {
      throw new ForbiddenException('Only owners can modify owner roles');
    }

    return this.prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, username: true, email: true } },
      },
    });
  }

  async removeMember(userId: string, projectId: string, memberId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const currentUserMember = project.members.find((m) => m.userId === userId);
    if (!currentUserMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const targetMember = project.members.find((m) => m.id === memberId);
    if (!targetMember) {
      throw new NotFoundException('Member not found in project');
    }

    if (targetMember.role === Role.OWNER) {
      throw new ForbiddenException('Cannot remove project owner');
    }

    if (currentUserMember.role !== Role.OWNER && currentUserMember.role !== Role.ADMIN) {
      if (targetMember.userId !== userId) {
        throw new ForbiddenException('Only owners and admins can remove other members');
      }
    }

    await this.prisma.projectMember.delete({ where: { id: memberId } });

    return { message: 'Member removed from project' };
  }
}
