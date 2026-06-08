import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto';
import { Role } from '@prisma/client';

@Injectable()
export class MilestonesService {
  constructor(private prisma: PrismaService) {}

  private async checkProjectAccess(userId: string, projectId: string, requireWrite: boolean = true): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }

    if (requireWrite && member.role === Role.VIEWER) {
      throw new ForbiddenException('Viewer cannot perform this action');
    }
  }

  async findAll(userId: string, projectId: string) {
    await this.checkProjectAccess(userId, projectId, false);

    return this.prisma.milestone.findMany({
      where: { projectId },
      include: {
        tasks: {
          include: {
            task: { select: { id: true, title: true, startDate: true, endDate: true, status: true, progress: true } },
          },
        },
        versions: { select: { id: true, version: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        tasks: {
          include: {
            task: { select: { id: true, title: true, startDate: true, endDate: true, status: true, progress: true } },
          },
        },
        versions: { select: { id: true, version: true } },
      },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    await this.checkProjectAccess(userId, milestone.projectId, false);

    return milestone;
  }

  async create(userId: string, createMilestoneDto: CreateMilestoneDto) {
    await this.checkProjectAccess(userId, createMilestoneDto.projectId);

    const milestone = await this.prisma.milestone.create({
      data: {
        projectId: createMilestoneDto.projectId,
        title: createMilestoneDto.title,
        description: createMilestoneDto.description,
        date: createMilestoneDto.date,
      },
    });

    if (createMilestoneDto.taskIds && createMilestoneDto.taskIds.length > 0) {
      await this.prisma.milestoneTask.createMany({
        data: createMilestoneDto.taskIds.map((taskId) => ({
          milestoneId: milestone.id,
          taskId,
        })),
        skipDuplicates: true,
      });
    }

    return this.findOne(userId, milestone.id);
  }

  async update(userId: string, id: string, updateMilestoneDto: UpdateMilestoneDto) {
    const existingMilestone = await this.prisma.milestone.findUnique({
      where: { id },
    });

    if (!existingMilestone) {
      throw new NotFoundException('Milestone not found');
    }

    await this.checkProjectAccess(userId, existingMilestone.projectId);

    const milestone = await this.prisma.milestone.update({
      where: { id },
      data: {
        title: updateMilestoneDto.title,
        description: updateMilestoneDto.description,
        date: updateMilestoneDto.date,
      },
    });

    if (updateMilestoneDto.taskIds !== undefined) {
      await this.prisma.milestoneTask.deleteMany({
        where: { milestoneId: id },
      });

      if (updateMilestoneDto.taskIds.length > 0) {
        await this.prisma.milestoneTask.createMany({
          data: updateMilestoneDto.taskIds.map((taskId) => ({
            milestoneId: milestone.id,
            taskId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(userId, milestone.id);
  }

  async remove(userId: string, id: string) {
    const existingMilestone = await this.prisma.milestone.findUnique({
      where: { id },
    });

    if (!existingMilestone) {
      throw new NotFoundException('Milestone not found');
    }

    await this.checkProjectAccess(userId, existingMilestone.projectId);

    await this.prisma.milestone.delete({ where: { id } });

    return { message: 'Milestone deleted successfully' };
  }
}
