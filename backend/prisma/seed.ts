import { PrismaClient, Role, TaskStatus, DependencyType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash("pm123456", saltRounds);
  const devPasswordHash = await bcrypt.hash("dev123456", saltRounds);

  const pmUser = await prisma.user.upsert({
    where: { username: "pm" },
    update: {},
    create: {
      username: "pm",
      email: "pm@example.com",
      password: passwordHash,
      name: "Project Manager",
    },
  });

  const dev1User = await prisma.user.upsert({
    where: { username: "dev1" },
    update: {},
    create: {
      username: "dev1",
      email: "dev1@example.com",
      password: devPasswordHash,
      name: "Developer One",
    },
  });

  const dev2User = await prisma.user.upsert({
    where: { username: "dev2" },
    update: {},
    create: {
      username: "dev2",
      email: "dev2@example.com",
      password: devPasswordHash,
      name: "Developer Two",
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "ws-1" },
    update: {},
    create: {
      id: "ws-1",
      name: "Main Workspace",
      ownerId: pmUser.id,
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "proj-1" },
    update: {},
    create: {
      id: "proj-1",
      name: "Website Redesign Project",
      description: "Complete redesign of the company website with new features",
      workspaceId: workspace.id,
      ownerId: pmUser.id,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: pmUser.id },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: pmUser.id,
      role: Role.OWNER,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: dev1User.id },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: dev1User.id,
      role: Role.MEMBER,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: dev2User.id },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: dev2User.id,
      role: Role.MEMBER,
    },
  });

  const today = new Date();
  const tasks: Array<{
    id: string;
    projectId: string;
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    progress: number;
    status: TaskStatus;
    parentId?: string;
    depth: number;
    assignees: string[];
  }> = [
    {
      id: "task-1",
      projectId: project.id,
      title: "Phase 1: Planning",
      description:
        "# Planning Phase\n\nComplete all planning activities before development starts",
      startDate: new Date(today.setDate(today.getDate())),
      endDate: new Date(today.setDate(today.getDate() + 7)),
      progress: 80,
      status: TaskStatus.IN_PROGRESS,
      depth: 0,
      assignees: [pmUser.id],
    },
    {
      id: "task-2",
      projectId: project.id,
      title: "Requirements Gathering",
      description: "Collect and document all requirements",
      startDate: new Date(today.setDate(today.getDate())),
      endDate: new Date(today.setDate(today.getDate() + 3)),
      progress: 100,
      status: TaskStatus.COMPLETED,
      parentId: "task-1",
      depth: 1,
      assignees: [pmUser.id],
    },
    {
      id: "task-3",
      projectId: project.id,
      title: "Technical Analysis",
      description: "Analyze technical feasibility and constraints",
      startDate: new Date(today.setDate(today.getDate() + 3)),
      endDate: new Date(today.setDate(today.getDate() + 5)),
      progress: 60,
      status: TaskStatus.IN_PROGRESS,
      parentId: "task-1",
      depth: 1,
      assignees: [dev1User.id, dev2User.id],
    },
    {
      id: "task-4",
      projectId: project.id,
      title: "UX Research",
      description: "User experience research and analysis",
      startDate: new Date(today.setDate(today.getDate())),
      endDate: new Date(today.setDate(today.getDate() + 4)),
      progress: 40,
      status: TaskStatus.IN_PROGRESS,
      parentId: "task-3",
      depth: 2,
      assignees: [dev1User.id],
    },
    {
      id: "task-5",
      projectId: project.id,
      title: "Phase 2: Design",
      description: "# Design Phase\n\nCreate all design assets and prototypes",
      startDate: new Date(today.setDate(today.getDate() + 7)),
      endDate: new Date(today.setDate(today.getDate() + 14)),
      progress: 30,
      status: TaskStatus.IN_PROGRESS,
      depth: 0,
      assignees: [dev1User.id],
    },
    {
      id: "task-6",
      projectId: project.id,
      title: "UI Wireframes",
      description: "Create low-fidelity wireframes",
      startDate: new Date(today.setDate(today.getDate() + 7)),
      endDate: new Date(today.setDate(today.getDate() + 10)),
      progress: 80,
      status: TaskStatus.IN_PROGRESS,
      parentId: "task-5",
      depth: 1,
      assignees: [dev1User.id],
    },
    {
      id: "task-7",
      projectId: project.id,
      title: "High-Fidelity Mockups",
      description: "Create pixel-perfect mockups",
      startDate: new Date(today.setDate(today.getDate() + 10)),
      endDate: new Date(today.setDate(today.getDate() + 14)),
      progress: 10,
      status: TaskStatus.TODO,
      parentId: "task-5",
      depth: 1,
      assignees: [dev1User.id, dev2User.id],
    },
    {
      id: "task-8",
      projectId: project.id,
      title: "Phase 3: Development",
      description: "# Development Phase\n\nBuild the actual product",
      startDate: new Date(today.setDate(today.getDate() + 14)),
      endDate: new Date(today.setDate(today.getDate() + 30)),
      progress: 0,
      status: TaskStatus.TODO,
      depth: 0,
      assignees: [pmUser.id, dev1User.id, dev2User.id],
    },
    {
      id: "task-9",
      projectId: project.id,
      title: "Frontend Development",
      description: "Build the user interface",
      startDate: new Date(today.setDate(today.getDate() + 14)),
      endDate: new Date(today.setDate(today.getDate() + 22)),
      progress: 0,
      status: TaskStatus.TODO,
      parentId: "task-8",
      depth: 1,
      assignees: [dev1User.id],
    },
    {
      id: "task-10",
      projectId: project.id,
      title: "Backend Development",
      description: "Build the API and database",
      startDate: new Date(today.setDate(today.getDate() + 14)),
      endDate: new Date(today.setDate(today.getDate() + 25)),
      progress: 0,
      status: TaskStatus.TODO,
      parentId: "task-8",
      depth: 1,
      assignees: [dev2User.id],
    },
    {
      id: "task-11",
      projectId: project.id,
      title: "API Integration",
      description: "Integrate frontend with backend APIs",
      startDate: new Date(today.setDate(today.getDate() + 22)),
      endDate: new Date(today.setDate(today.getDate() + 28)),
      progress: 0,
      status: TaskStatus.TODO,
      parentId: "task-8",
      depth: 1,
      assignees: [dev1User.id, dev2User.id],
    },
    {
      id: "task-12",
      projectId: project.id,
      title: "Phase 4: Testing",
      description: "# Testing Phase\n\nComprehensive testing and QA",
      startDate: new Date(today.setDate(today.getDate() + 28)),
      endDate: new Date(today.setDate(today.getDate() + 35)),
      progress: 0,
      status: TaskStatus.TODO,
      depth: 0,
      assignees: [pmUser.id, dev1User.id, dev2User.id],
    },
    {
      id: "task-13",
      projectId: project.id,
      title: "Unit Testing",
      description: "Write and execute unit tests",
      startDate: new Date(today.setDate(today.getDate() + 28)),
      endDate: new Date(today.setDate(today.getDate() + 31)),
      progress: 0,
      status: TaskStatus.TODO,
      parentId: "task-12",
      depth: 1,
      assignees: [dev1User.id],
    },
    {
      id: "task-14",
      projectId: project.id,
      title: "Integration Testing",
      description: "Test system integration",
      startDate: new Date(today.setDate(today.getDate() + 31)),
      endDate: new Date(today.setDate(today.getDate() + 34)),
      progress: 0,
      status: TaskStatus.TODO,
      parentId: "task-12",
      depth: 1,
      assignees: [dev2User.id],
    },
    {
      id: "task-15",
      projectId: project.id,
      title: "UAT and Deployment",
      description: "User acceptance testing and production deployment",
      startDate: new Date(today.setDate(today.getDate() + 34)),
      endDate: new Date(today.setDate(today.getDate() + 35)),
      progress: 0,
      status: TaskStatus.TODO,
      parentId: "task-12",
      depth: 1,
      assignees: [pmUser.id],
    },
  ];

  for (const taskData of tasks) {
    const { assignees, ...taskCreate } = taskData;
    await prisma.task.upsert({
      where: { id: taskData.id },
      update: {},
      create: taskCreate,
    });

    for (const assigneeId of assignees) {
      await prisma.taskAssignee.upsert({
        where: {
          taskId_userId: { taskId: taskData.id, userId: assigneeId },
        },
        update: {},
        create: {
          taskId: taskData.id,
          userId: assigneeId,
        },
      });
    }
  }

  const dependencies = [
    { fromTaskId: "task-2", toTaskId: "task-3", type: DependencyType.FS },
    { fromTaskId: "task-4", toTaskId: "task-7", type: DependencyType.FS },
    { fromTaskId: "task-1", toTaskId: "task-5", type: DependencyType.FS },
    { fromTaskId: "task-6", toTaskId: "task-7", type: DependencyType.FS },
    { fromTaskId: "task-5", toTaskId: "task-8", type: DependencyType.FS },
    { fromTaskId: "task-9", toTaskId: "task-11", type: DependencyType.FS },
    { fromTaskId: "task-10", toTaskId: "task-11", type: DependencyType.FF },
    { fromTaskId: "task-8", toTaskId: "task-12", type: DependencyType.FS },
    { fromTaskId: "task-13", toTaskId: "task-14", type: DependencyType.SS },
    { fromTaskId: "task-14", toTaskId: "task-15", type: DependencyType.FS },
  ];

  for (const dep of dependencies) {
    await prisma.taskDependency.upsert({
      where: {
        fromTaskId_toTaskId: {
          fromTaskId: dep.fromTaskId,
          toTaskId: dep.toTaskId,
        },
      },
      update: {},
      create: dep,
    });
  }

  const milestone1 = await prisma.milestone.upsert({
    where: { id: "ms-1" },
    update: {},
    create: {
      id: "ms-1",
      title: "Design Complete",
      date: new Date(today.setDate(today.getDate() + 14)),
      description: "All design work must be completed by this date",
      projectId: project.id,
    },
  });

  const milestone2 = await prisma.milestone.upsert({
    where: { id: "ms-2" },
    update: {},
    create: {
      id: "ms-2",
      title: "Launch Day",
      date: new Date(today.setDate(today.getDate() + 35)),
      description: "Project launch date",
      projectId: project.id,
    },
  });

  await prisma.milestoneTask.upsert({
    where: {
      milestoneId_taskId: { milestoneId: milestone1.id, taskId: "task-5" },
    },
    update: {},
    create: {
      milestoneId: milestone1.id,
      taskId: "task-5",
    },
  });

  await prisma.milestoneTask.upsert({
    where: {
      milestoneId_taskId: { milestoneId: milestone2.id, taskId: "task-15" },
    },
    update: {},
    create: {
      milestoneId: milestone2.id,
      taskId: "task-15",
    },
  });

  await prisma.version.upsert({
    where: { id: "ver-1" },
    update: {},
    create: {
      id: "ver-1",
      projectId: project.id,
      version: "1.0.0",
      milestoneId: milestone2.id,
      description: "Initial release version",
    },
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
