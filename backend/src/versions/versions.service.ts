import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVersionDto, UpdateVersionDto } from './dto';
import { Role } from '@prisma/client';

@Injectable()
export class VersionsService {
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

    return this.prisma.version.findMany({
      where: { projectId },
      include: {
        milestone: { select: { id: true, title: true, date: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const version = await this.prisma.version.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, title: true, date: true } },
      },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    await this.checkProjectAccess(userId, version.projectId, false);

    return version;
  }

  async create(userId: string, createVersionDto: CreateVersionDto) {
    await this.checkProjectAccess(userId, createVersionDto.projectId);

    if (createVersionDto.milestoneId) {
      const milestone = await this.prisma.milestone.findUnique({
        where: { id: createVersionDto.milestoneId },
        select: { projectId: true },
      });

      if (!milestone || milestone.projectId !== createVersionDto.projectId) {
        throw new BadRequestException('Invalid milestone');
      }
    }

    const existing = await this.prisma.version.findUnique({
      where: {
        projectId_version: {
          projectId: createVersionDto.projectId,
          version: createVersionDto.version,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Version already exists for this project');
    }

    return this.prisma.version.create({
      data: createVersionDto,
      include: {
        milestone: { select: { id: true, title: true, date: true } },
      },
    });
  }

  async update(userId: string, id: string, updateVersionDto: UpdateVersionDto) {
    const existingVersion = await this.prisma.version.findUnique({
      where: { id },
    });

    if (!existingVersion) {
      throw new NotFoundException('Version not found');
    }

    await this.checkProjectAccess(userId, existingVersion.projectId);

    if (updateVersionDto.milestoneId) {
      const milestone = await this.prisma.milestone.findUnique({
        where: { id: updateVersionDto.milestoneId },
        select: { projectId: true },
      });

      if (!milestone || milestone.projectId !== existingVersion.projectId) {
        throw new BadRequestException('Invalid milestone');
      }
    }

    return this.prisma.version.update({
      where: { id },
      data: updateVersionDto,
      include: {
        milestone: { select: { id: true, title: true, date: true } },
      },
    });
  }

  async remove(userId: string, id: string) {
    const existingVersion = await this.prisma.version.findUnique({
      where: { id },
    });

    if (!existingVersion) {
      throw new NotFoundException('Version not found');
    }

    await this.checkProjectAccess(userId, existingVersion.projectId);

    await this.prisma.version.delete({ where: { id } });

    return { message: 'Version deleted successfully' };
  }
}
