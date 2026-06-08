import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, search?: string, limit: number = 20) {
    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        createdAt: true,
      },
      take: limit,
      orderBy: { username: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        createdAt: true,
        memberships: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async searchByProject(userId: string, projectId: string, search?: string, limit: number = 20) {
    const members = await this.prisma.projectMember.findMany({
      where: {
        projectId,
      },
      select: {
        userId: true,
        role: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const memberIds = members.map((m) => m.userId);

    const where: any = {
      NOT: { id: { in: memberIds.length > 0 ? memberIds : ['none'] } },
    };

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
      },
      take: limit,
      orderBy: { username: 'asc' },
    });
  }
}
