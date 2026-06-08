import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import type {
  User,
  UserRef,
  Workspace,
  Project,
  Task,
  Milestone,
  Version,
  TaskDependency,
  Invitation,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Role,
  DependencyType
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:13005'

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (data: LoginRequest): Promise<AuthResponse> =>
    api.post('/auth/login', data).then((r) => r.data),
  
  register: (data: RegisterRequest): Promise<AuthResponse> =>
    api.post('/auth/register', data).then((r) => r.data),
  
  getCurrentUser: (): Promise<UserRef> =>
    api.get('/auth/me').then((r) => r.data),
}

export const workspaceApi = {
  getAll: (): Promise<Workspace[]> =>
    api.get('/workspaces').then((r) => r.data),
  
  getOne: (id: string): Promise<Workspace> =>
    api.get(`/workspaces/${id}`).then((r) => r.data),
  
  create: (data: { name: string }): Promise<Workspace> =>
    api.post('/workspaces', data).then((r) => r.data),
  
  update: (id: string, data: { name: string }): Promise<Workspace> =>
    api.patch(`/workspaces/${id}`, data).then((r) => r.data),
  
  delete: (id: string): Promise<void> =>
    api.delete(`/workspaces/${id}`).then((r) => r.data),
}

export const projectApi = {
  getAll: (workspaceId: string, cursor?: string, limit = 20) => {
    const params: any = { workspaceId, limit }
    if (cursor) params.cursor = cursor
    return api.get('/projects', { params }).then((r) => r.data)
  },
  
  getOne: (id: string): Promise<Project> =>
    api.get(`/projects/${id}`).then((r) => r.data),
  
  create: (data: { workspaceId: string; name: string; description?: string }): Promise<Project> =>
    api.post('/projects', data).then((r) => r.data),
  
  update: (id: string, data: { name?: string; description?: string }): Promise<Project> =>
    api.patch(`/projects/${id}`, data).then((r) => r.data),
  
  delete: (id: string): Promise<void> =>
    api.delete(`/projects/${id}`).then((r) => r.data),
  
  updateMemberRole: (projectId: string, memberId: string, role: Role) =>
    api.patch(`/projects/${projectId}/members/${memberId}/role`, { role }).then((r) => r.data),
  
  removeMember: (projectId: string, memberId: string) =>
    api.delete(`/projects/${projectId}/members/${memberId}`).then((r) => r.data),
}

export const taskApi = {
  getAll: (projectId: string, cursor?: string, limit = 50) => {
    const params: any = { projectId, limit }
    if (cursor) params.cursor = cursor
    return api.get('/tasks', { params }).then((r) => r.data)
  },
  
  getOne: (id: string): Promise<Task> =>
    api.get(`/tasks/${id}`).then((r) => r.data),
  
  create: (data: any): Promise<Task> =>
    api.post('/tasks', data).then((r) => r.data),
  
  update: (id: string, data: any): Promise<Task> =>
    api.patch(`/tasks/${id}`, data).then((r) => r.data),
  
  updateTime: (id: string, data: { startDate: string; endDate: string; autoAdjustDependents?: string }) =>
    api.patch(`/tasks/${id}/time`, data).then((r) => r.data),
  
  delete: (id: string) =>
    api.delete(`/tasks/${id}`).then((r) => r.data),
}

export const dependencyApi = {
  getAll: (projectId: string): Promise<TaskDependency[]> =>
    api.get('/dependencies', { params: { projectId } }).then((r) => r.data),
  
  create: (data: { fromTaskId: string; toTaskId: string; type?: DependencyType }): Promise<TaskDependency> =>
    api.post('/dependencies', data).then((r) => r.data),
  
  delete: (id: string) =>
    api.delete(`/dependencies/${id}`).then((r) => r.data),
}

export const milestoneApi = {
  getAll: (projectId: string): Promise<Milestone[]> =>
    api.get('/milestones', { params: { projectId } }).then((r) => r.data),
  
  getOne: (id: string): Promise<Milestone> =>
    api.get(`/milestones/${id}`).then((r) => r.data),
  
  create: (data: any): Promise<Milestone> =>
    api.post('/milestones', data).then((r) => r.data),
  
  update: (id: string, data: any): Promise<Milestone> =>
    api.patch(`/milestones/${id}`, data).then((r) => r.data),
  
  delete: (id: string) =>
    api.delete(`/milestones/${id}`).then((r) => r.data),
}

export const versionApi = {
  getAll: (projectId: string): Promise<Version[]> =>
    api.get('/versions', { params: { projectId } }).then((r) => r.data),
  
  getOne: (id: string): Promise<Version> =>
    api.get(`/versions/${id}`).then((r) => r.data),
  
  create: (data: { projectId: string; version: string; milestoneId?: string; description?: string }): Promise<Version> =>
    api.post('/versions', data).then((r) => r.data),
  
  update: (id: string, data: { version?: string; milestoneId?: string; description?: string }): Promise<Version> =>
    api.patch(`/versions/${id}`, data).then((r) => r.data),
  
  delete: (id: string) =>
    api.delete(`/versions/${id}`).then((r) => r.data),
}

export const invitationApi = {
  getAll: (projectId: string): Promise<Invitation[]> =>
    api.get('/invitations', { params: { projectId } }).then((r) => r.data),
  
  create: (data: { projectId: string; email: string; role?: Role }): Promise<Invitation> =>
    api.post('/invitations', data).then((r) => r.data),
  
  accept: (token: string) =>
    api.post('/invitations/accept', { token }).then((r) => r.data),
  
  delete: (id: string) =>
    api.delete(`/invitations/${id}`).then((r) => r.data),
}

export const userApi = {
  search: (search?: string, limit = 20) => {
    const params: any = { limit }
    if (search) params.search = search
    return api.get('/users', { params }).then((r) => r.data)
  },
  
  searchForInvite: (projectId: string, search?: string, limit = 20) => {
    const params: any = { projectId, limit }
    if (search) params.search = search
    return api.get('/users/search-by-project', { params }).then((r) => r.data)
  },
  
  getOne: (id: string): Promise<User> =>
    api.get(`/users/${id}`).then((r) => r.data),
}

export default api
