import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, Socket } from 'socket.io-client'
import { taskApi, dependencyApi } from '@/api'
import type { Task, TaskDependency, DependencyType, TaskStatus } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:13005'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const dependencies = ref<TaskDependency[]>([])
  const loading = ref(false)
  const currentProjectId = ref<string | null>(null)
  let socket: Socket | null = null

  const tasksById = computed(() => {
    const map = new Map<string, Task>()
    tasks.value.forEach((task) => map.set(task.id, task))
    return map
  })

  const rootTasks = computed(() => {
    return tasks.value.filter((t) => !t.parentId).sort((a, b) => a.orderIndex - b.orderIndex)
  })

  function getChildren(parentId: string): Task[] {
    return tasks.value
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
  }

  async function fetchTasks(projectId: string) {
    loading.value = true
    currentProjectId.value = projectId
    try {
      const result = await taskApi.getAll(projectId)
      tasks.value = result.tasks || []
      await fetchDependencies(projectId)
      connectWebSocket(projectId)
    } finally {
      loading.value = false
    }
  }

  async function fetchDependencies(projectId: string) {
    dependencies.value = await dependencyApi.getAll(projectId)
  }

  function connectWebSocket(projectId: string) {
    if (socket) {
      socket.disconnect()
    }

    const token = localStorage.getItem('token')
    if (!token) return

    socket = io(`${API_BASE_URL}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      socket?.emit('join_project', { projectId })
    })

    socket.on('task_created', (task: Task) => {
      if (!tasks.value.find((t) => t.id === task.id)) {
        tasks.value.push(task)
      }
    })

    socket.on('task_updated', (task: Task) => {
      const index = tasks.value.findIndex((t) => t.id === task.id)
      if (index !== -1) {
        tasks.value[index] = { ...tasks.value[index], ...task }
      }
    })

    socket.on('task_deleted', (data: { id: string }) => {
      tasks.value = tasks.value.filter((t) => t.id !== data.id)
      dependencies.value = dependencies.value.filter(
        (d) => d.fromTaskId !== data.id && d.toTaskId !== data.id
      )
    })

    socket.on('dependency_created', (dep: TaskDependency) => {
      if (!dependencies.value.find((d) => d.id === dep.id)) {
        dependencies.value.push(dep)
      }
    })

    socket.on('dependency_deleted', (data: { id: string }) => {
      dependencies.value = dependencies.value.filter((d) => d.id !== data.id)
    })
  }

  function disconnectWebSocket() {
    if (socket) {
      socket.disconnect()
      socket = null
    }
    currentProjectId.value = null
  }

  async function createTask(data: any) {
    const task = await taskApi.create(data)
    return task
  }

  async function updateTask(id: string, data: any) {
    const task = await taskApi.update(id, data)
    return task
  }

  async function updateTaskTime(id: string, startDate: string, endDate: string, autoAdjust: string = 'none') {
    return await taskApi.updateTime(id, {
      startDate,
      endDate,
      autoAdjustDependents: autoAdjust,
    })
  }

  async function deleteTask(id: string) {
    await taskApi.delete(id)
  }

  async function createDependency(fromTaskId: string, toTaskId: string, type: DependencyType = DependencyType.FS) {
    return await dependencyApi.create({ fromTaskId, toTaskId, type })
  }

  async function deleteDependency(id: string) {
    await dependencyApi.delete(id)
  }

  function getTaskDependencies(taskId: string): TaskDependency[] {
    return dependencies.value.filter((d) => d.fromTaskId === taskId)
  }

  function getTaskDependents(taskId: string): TaskDependency[] {
    return dependencies.value.filter((d) => d.toTaskId === taskId)
  }

  function getCriticalPath(): string[] {
    const criticalPaths: string[][] = []
    const taskMap = tasksById.value

    const endTasks = tasks.value.filter(
      (t) => !dependencies.value.some((d) => d.fromTaskId === t.id)
    )

    function findLongestPath(taskId: string, path: string[]): string[] {
      const newPath = [...path, taskId]
      const deps = dependencies.value.filter((d) => d.toTaskId === taskId)

      if (deps.length === 0) {
        return newPath
      }

      let longest: string[] = []
      let maxDuration = 0

      for (const dep of deps) {
        const subPath = findLongestPath(dep.fromTaskId, newPath)
        const duration = calculatePathDuration(subPath)
        if (duration > maxDuration) {
          maxDuration = duration
          longest = subPath
        }
      }

      return longest
    }

    function calculatePathDuration(path: string[]): number {
      return path.reduce((total, taskId) => {
        const task = taskMap.get(taskId)
        if (task?.startDate && task?.endDate) {
          return total + (new Date(task.endDate).getTime() - new Date(task.startDate).getTime())
        }
        return total
      }, 0)
    }

    for (const endTask of endTasks) {
      const path = findLongestPath(endTask.id, [])
      criticalPaths.push(path)
    }

    const allCritical = new Set<string>()
    criticalPaths.forEach((path) => path.forEach((id) => allCritical.add(id)))

    return Array.from(allCritical)
  }

  return {
    tasks,
    dependencies,
    loading,
    currentProjectId,
    tasksById,
    rootTasks,
    getChildren,
    fetchTasks,
    fetchDependencies,
    connectWebSocket,
    disconnectWebSocket,
    createTask,
    updateTask,
    updateTaskTime,
    deleteTask,
    createDependency,
    deleteDependency,
    getTaskDependencies,
    getTaskDependents,
    getCriticalPath,
  }
})
