import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { WebSocketGatewayService } from "../websocket/websocket.gateway";
import { CreateTaskDto, UpdateTaskDto, UpdateTaskTimeDto } from "./dto";
import { Role, TaskStatus } from "@prisma/client";

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private wsGateway: WebSocketGatewayService,
  ) {}

  private async checkProjectAccess(
    userId: string,
    projectId: string,
    requireWrite: boolean = true,
  ): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException("You do not have access to this project");
    }

    if (requireWrite && member.role === Role.VIEWER) {
      throw new ForbiddenException("Viewer cannot perform this action");
    }
  }

  async findAll(
    userId: string,
    projectId: string,
    cursor?: string,
    limit: number = 50,
  ) {
    await this.checkProjectAccess(userId, projectId, false);

    const cached = await this.redisService.getTasks(projectId);
    if (cached && !cursor) {
      return cached;
    }

    const where: any = { projectId };
    if (cursor) {
      where.id = { gt: cursor };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, username: true, email: true },
            },
          },
        },
        dependencies: {
          include: {
            fromTask: { select: { id: true, title: true } },
          },
        },
        dependents: {
          include: {
            toTask: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      take: limit + 1,
    });

    const hasMore = tasks.length > limit;
    const resultTasks = hasMore ? tasks.slice(0, -1) : tasks;

    const result = {
      tasks: resultTasks,
      cursor: hasMore ? resultTasks[resultTasks.length - 1].id : null,
      hasMore,
    };

    if (!cursor) {
      await this.redisService.setTasks(projectId, result);
    }

    return result;
  }

  async findOne(userId: string, id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, username: true, email: true },
            },
          },
        },
        dependencies: {
          include: {
            fromTask: { select: { id: true, title: true } },
          },
        },
        dependents: {
          include: {
            toTask: { select: { id: true, title: true } },
          },
        },
        project: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    await this.checkProjectAccess(userId, task.projectId, false);

    return task;
  }

  async create(userId: string, createTaskDto: CreateTaskDto) {
    await this.checkProjectAccess(userId, createTaskDto.projectId);

    let parentTask = null;
    let depth = 0;

    if (createTaskDto.parentId) {
      parentTask = await this.prisma.task.findUnique({
        where: { id: createTaskDto.parentId },
        select: { depth: true, projectId: true },
      });

      if (!parentTask || parentTask.projectId !== createTaskDto.projectId) {
        throw new BadRequestException("Invalid parent task");
      }

      if (parentTask.depth >= 2) {
        throw new BadRequestException(
          "Maximum nesting depth (3 levels) reached",
        );
      }

      depth = parentTask.depth + 1;
    }

    if (
      createTaskDto.progress &&
      (createTaskDto.progress < 0 || createTaskDto.progress > 100)
    ) {
      throw new BadRequestException("Progress must be between 0 and 100");
    }

    const task = await this.prisma.task.create({
      data: {
        projectId: createTaskDto.projectId,
        title: createTaskDto.title,
        description: createTaskDto.description,
        startDate: createTaskDto.startDate,
        endDate: createTaskDto.endDate,
        progress: createTaskDto.progress || 0,
        status: createTaskDto.status || TaskStatus.TODO,
        parentId: createTaskDto.parentId,
        depth,
        orderIndex: createTaskDto.orderIndex || 0,
      },
    });

    if (createTaskDto.assigneeIds && createTaskDto.assigneeIds.length > 0) {
      await this.prisma.taskAssignee.createMany({
        data: createTaskDto.assigneeIds.map((assigneeId) => ({
          taskId: task.id,
          userId: assigneeId,
        })),
        skipDuplicates: true,
      });
    }

    await this.redisService.invalidateTasks(createTaskDto.projectId);
    await this.wsGateway.broadcastTaskEvent(
      createTaskDto.projectId,
      "task_created",
      task,
    );

    return this.findOne(userId, task.id);
  }

  async update(userId: string, id: string, updateTaskDto: UpdateTaskDto) {
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
      include: {
        dependencies: true,
        dependents: true,
      },
    });

    if (!existingTask) {
      throw new NotFoundException("Task not found");
    }

    await this.checkProjectAccess(userId, existingTask.projectId);

    if (
      updateTaskDto.progress !== undefined &&
      (updateTaskDto.progress < 0 || updateTaskDto.progress > 100)
    ) {
      throw new BadRequestException("Progress must be between 0 and 100");
    }

    if (
      updateTaskDto.parentId &&
      updateTaskDto.parentId !== existingTask.parentId
    ) {
      const parentTask = await this.prisma.task.findUnique({
        where: { id: updateTaskDto.parentId },
        select: { id: true, depth: true, projectId: true, parentId: true },
      });

      if (!parentTask || parentTask.projectId !== existingTask.projectId) {
        throw new BadRequestException("Invalid parent task");
      }

      if (parentTask.depth >= 2) {
        throw new BadRequestException(
          "Maximum nesting depth (3 levels) reached",
        );
      }

      let checkParent = parentTask;
      while (checkParent) {
        if (checkParent.id === existingTask.id) {
          throw new BadRequestException(
            "Cannot create circular parent reference",
          );
        }
        if (checkParent.parentId) {
          checkParent = await this.prisma.task.findUnique({
            where: { id: checkParent.parentId },
            select: { id: true, depth: true, projectId: true, parentId: true },
          });
        } else {
          break;
        }
      }
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        title: updateTaskDto.title,
        description: updateTaskDto.description,
        startDate: updateTaskDto.startDate,
        endDate: updateTaskDto.endDate,
        progress: updateTaskDto.progress,
        status: updateTaskDto.status,
        parentId: updateTaskDto.parentId,
        orderIndex: updateTaskDto.orderIndex,
      },
    });

    if (updateTaskDto.assigneeIds !== undefined) {
      await this.prisma.taskAssignee.deleteMany({
        where: { taskId: id },
      });

      if (updateTaskDto.assigneeIds.length > 0) {
        await this.prisma.taskAssignee.createMany({
          data: updateTaskDto.assigneeIds.map((assigneeId) => ({
            taskId: task.id,
            userId: assigneeId,
          })),
          skipDuplicates: true,
        });
      }
    }

    await this.redisService.invalidateTasks(existingTask.projectId);
    await this.wsGateway.broadcastTaskEvent(
      existingTask.projectId,
      "task_updated",
      task,
    );

    return this.findOne(userId, task.id);
  }

  async updateTaskTime(userId: string, id: string, dto: UpdateTaskTimeDto) {
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
      include: {
        dependencies: {
          include: {
            fromTask: { select: { id: true, startDate: true, endDate: true } },
          },
        },
        dependents: {
          include: {
            toTask: { select: { id: true, startDate: true, endDate: true } },
          },
        },
      },
    });

    if (!existingTask) {
      throw new NotFoundException("Task not found");
    }

    await this.checkProjectAccess(userId, existingTask.projectId);

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
    });

    const affectedTasks = [];

    if (dto.autoAdjustDependents && dto.autoAdjustDependents !== "none") {
      affectedTasks.push(
        ...(await this.adjustDependentTasks(id, dto.startDate, dto.endDate)),
      );
    }

    await this.redisService.invalidateTasks(existingTask.projectId);
    await this.wsGateway.broadcastTaskEvent(
      existingTask.projectId,
      "task_updated",
      task,
    );

    for (const affected of affectedTasks) {
      await this.wsGateway.broadcastTaskEvent(
        existingTask.projectId,
        "task_updated",
        affected,
      );
    }

    return {
      task,
      affectedTasks,
      conflicts: [],
    };
  }

  private async adjustDependentTasks(
    taskId: string,
    newStartDate: any,
    newEndDate: any,
    visited: Set<string> = new Set(),
  ): Promise<any[]> {
    const adjusted: any[] = [];

    if (visited.has(taskId)) {
      return adjusted;
    }
    visited.add(taskId);

    const dependents = await this.prisma.taskDependency.findMany({
      where: { fromTaskId: taskId },
      include: { toTask: true },
    });

    const newStartTime = newStartDate ? new Date(newStartDate).getTime() : null;
    const newEndTime = newEndDate ? new Date(newEndDate).getTime() : null;

    for (const dep of dependents) {
      const toTask = dep.toTask;

      if (visited.has(toTask.id)) {
        continue;
      }

      if (!toTask.startDate || !toTask.endDate) {
        continue;
      }

      const currentStartTime = toTask.startDate.getTime();
      const currentEndTime = toTask.endDate.getTime();
      const duration = currentEndTime - currentStartTime;

      let shouldAdjust = false;
      let updatedStartTime = currentStartTime;
      let updatedEndTime = currentEndTime;

      if (dep.type === "FS") {
        if (newEndTime !== null && currentStartTime < newEndTime) {
          updatedStartTime = newEndTime;
          updatedEndTime = updatedStartTime + duration;
          shouldAdjust = true;
        }
      } else if (dep.type === "SS") {
        if (newStartTime !== null && currentStartTime < newStartTime) {
          updatedStartTime = newStartTime;
          updatedEndTime = updatedStartTime + duration;
          shouldAdjust = true;
        }
      } else if (dep.type === "FF") {
        if (newEndTime !== null && currentEndTime < newEndTime) {
          updatedEndTime = newEndTime;
          updatedStartTime = updatedEndTime - duration;
          shouldAdjust = true;
        }
      }

      if (shouldAdjust) {
        const updatedStart = new Date(updatedStartTime);
        const updatedEnd = new Date(updatedEndTime);

        const updatedTask = await this.prisma.task.update({
          where: { id: toTask.id },
          data: { startDate: updatedStart, endDate: updatedEnd },
        });

        adjusted.push(updatedTask);
        adjusted.push(
          ...(await this.adjustDependentTasks(
            toTask.id,
            updatedStart,
            updatedEnd,
            visited,
          )),
        );
      }
    }

    return adjusted;
  }

  async remove(userId: string, id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    await this.checkProjectAccess(userId, task.projectId);

    await this.prisma.task.delete({ where: { id } });

    await this.redisService.invalidateTasks(task.projectId);
    await this.wsGateway.broadcastTaskEvent(task.projectId, "task_deleted", {
      id,
    });

    return { message: "Task deleted successfully" };
  }
}
