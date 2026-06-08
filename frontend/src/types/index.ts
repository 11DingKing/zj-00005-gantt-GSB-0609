export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED'
}

export enum DependencyType {
  FS = 'FS',
  SS = 'SS',
  FF = 'FF'
}

export interface User {
  id: string
  username: string
  email: string
  name?: string
  createdAt: string
}

export interface UserRef {
  id: string
  name?: string
  username: string
  email: string
}

export interface Workspace {
  id: string
  name: string
  ownerId: string
  owner: UserRef
  createdAt: string
  updatedAt: string
  _count?: {
    projects: number
  }
  projects?: Project[]
}

export interface Project {
  id: string
  name: string
  description?: string
  workspaceId: string
  ownerId: string
  owner: UserRef
  createdAt: string
  updatedAt: string
  myRole?: Role
  _count?: {
    members: number
    tasks: number
    milestones: number
    versions: number
  }
  members?: ProjectMember[]
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: Role
  joinedAt: string
  user: UserRef
}

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string
  startDate?: string
  endDate?: string
  progress: number
  status: TaskStatus
  parentId?: string
  depth: number
  orderIndex: number
  createdAt: string
  updatedAt: string
  assignees: TaskAssignee[]
  dependencies: TaskDependency[]
  dependents: TaskDependency[]
}

export interface TaskAssignee {
  id: string
  taskId: string
  userId: string
  user: UserRef
}

export interface TaskDependency {
  id: string
  fromTaskId: string
  toTaskId: string
  type: DependencyType
  fromTask?: { id: string; title: string }
  toTask?: { id: string; title: string }
}

export interface Milestone {
  id: string
  projectId: string
  title: string
  date: string
  description?: string
  createdAt: string
  updatedAt: string
  tasks?: MilestoneTask[]
  versions?: { id: string; version: string }[]
}

export interface MilestoneTask {
  id: string
  milestoneId: string
  taskId: string
  task: {
    id: string
    title: string
    startDate?: string
    endDate?: string
    status: TaskStatus
    progress: number
  }
}

export interface Version {
  id: string
  projectId: string
  version: string
  milestoneId?: string
  description?: string
  createdAt: string
  updatedAt: string
  milestone?: { id: string; title: string; date: string }
}

export interface Invitation {
  id: string
  projectId: string
  email: string
  role: Role
  token: string
  invitedById: string
  createdAt: string
  expiresAt: string
  accepted: boolean
  project?: { id: string; name: string }
  invitedBy?: UserRef
}

export interface CursorPage<T> {
  items: T[]
  cursor: string | null
  hasMore: boolean
}

export interface AuthResponse {
  accessToken: string
  user: UserRef
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  name?: string
}
