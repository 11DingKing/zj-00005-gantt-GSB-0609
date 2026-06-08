import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WebSocketGatewayService } from '../websocket/websocket.gateway';
import { CreateDependencyDto } from './dto';
import { Role, DependencyType } from '@prisma/client';

@Injectable()
export class DependenciesService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private wsGateway: WebSocketGatewayService,
  ) {}

  private async checkTaskAccess(userId: string, taskId: string): Promise<string> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }

    if (member.role === Role.VIEWER) {
      throw new ForbiddenException('Viewer cannot perform this action');
    }

    return task.projectId;
  }

  private async wouldCreateCycle(fromTaskId: string, toTaskId: string): Promise<boolean> {
    const visited = new Set<string>();
    const queue = [toTaskId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === fromTaskId) {
        return true;
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      const dependents = await this.prisma.taskDependency.findMany({
        where: { fromTaskId: current },
        select: { toTaskId: true },
      });

      for (const dep of dependents) {
        if (!visited.has(dep.toTaskId)) {
          queue.push(dep.toTaskId);
        }
      }
    }

    return false;
  }

  async create(userId: string, createDependencyDto: CreateDependencyDto) {
    if (createDependencyDto.fromTaskId === createDependencyDto.toTaskId) {
      throw new BadRequestException('Cannot create dependency from task to itself');
    }

    const [fromTask, toTask] = await Promise.all([
      this.prisma.task.findUnique({
        where: { id: createDependencyDto.fromTaskId },
        select: { projectId: true },
      }),
      this.prisma.task.findUnique({
        where: { id: createDependencyDto.toTaskId },
        select: { projectId: true },
      }),
    ]);

    if (!fromTask || !toTask) {
      throw new NotFoundException('One or both tasks not found');
    }

    if (fromTask.projectId !== toTask.projectId) {
      throw new BadRequestException('Tasks must be in the same project');
    }

    const projectId = fromTask.projectId;
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }

    if (member.role === Role.VIEWER) {
      throw new ForbiddenException('Viewer cannot perform this action');
    }

    if (await this.wouldCreateCycle(createDependencyDto.fromTaskId, createDependencyDto.toTaskId)) {
      throw new BadRequestException('Creating this dependency would create a cycle');
    }

    const existing = await this.prisma.taskDependency.findUnique({
      where: {
        fromTaskId_toTaskId: {
          fromTaskId: createDependencyDto.fromTaskId,
          toTaskId: createDependencyDto.toTaskId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Dependency already exists');
    }

    const dependency = await this.prisma.taskDependency.create({
      data: {
        fromTaskId: createDependencyDto.fromTaskId,
        toTaskId: createDependencyDto.toTaskId,
        type: createDependencyDto.type || DependencyType.FS,
      },
      include: {
        fromTask: { select: { id: true, title: true } },
        toTask: { select: { id: true, title: true } },
      },
    });

    await this.redisService.invalidateTasks(projectId);
    await this.wsGateway.broadcastTaskEvent(projectId, 'dependency_created', dependency);

    return dependency;
  }

  async remove(userId: string, id: string) {
    const dependency = await this.prisma.taskDependency.findUnique({
      where: { id },
      include: {
        fromTask: { select: { projectId: true } },
      },
    });

    if (!dependency) {
      throw new NotFoundException('Dependency not found');
    }

    const projectId = dependency.fromTask.projectId;
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }

    if (member.role === Role.VIEWER) {
      throw new ForbiddenException('Viewer cannot perform this action');
    }

    await this.prisma.taskDependency.delete({ where: { id } });

    await this.redisService.invalidateTasks(projectId);
    await this.wsGateway.broadcastTaskEvent(projectId, 'dependency_deleted', { id });

    return { message: 'Dependency deleted successfully' };
  }

  async findByProject(userId: string, projectId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return this.prisma.taskDependency.findMany({
      where: {
        fromTask: { projectId },
      },
      include: {
        fromTask: { select: { id: true, title: true } },
        toTask: { select: { id: true, title: true } },
      },
    });
  }
}
