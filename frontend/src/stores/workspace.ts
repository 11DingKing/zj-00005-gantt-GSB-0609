import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { workspaceApi } from '@/api'
import type { Workspace } from '@/types'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([])
  const currentWorkspace = ref<Workspace | null>(null)
  const loading = ref(false)

  const hasWorkspaces = computed(() => workspaces.value.length > 0)

  async function fetchWorkspaces() {
    loading.value = true
    try {
      workspaces.value = await workspaceApi.getAll()
      if (workspaces.value.length > 0 && !currentWorkspace.value) {
        currentWorkspace.value = workspaces.value[0]
      }
    } finally {
      loading.value = false
    }
  }

  async function createWorkspace(name: string) {
    const workspace = await workspaceApi.create({ name })
    workspaces.value.unshift(workspace)
    currentWorkspace.value = workspace
    return workspace
  }

  async function updateWorkspace(id: string, name: string) {
    const workspace = await workspaceApi.update(id, { name })
    const index = workspaces.value.findIndex((w) => w.id === id)
    if (index !== -1) {
      workspaces.value[index] = workspace
    }
    if (currentWorkspace.value?.id === id) {
      currentWorkspace.value = workspace
    }
    return workspace
  }

  async function deleteWorkspace(id: string) {
    await workspaceApi.delete(id)
    workspaces.value = workspaces.value.filter((w) => w.id !== id)
    if (currentWorkspace.value?.id === id) {
      currentWorkspace.value = workspaces.value[0] || null
    }
  }

  function setCurrentWorkspace(id: string) {
    const workspace = workspaces.value.find((w) => w.id === id)
    if (workspace) {
      currentWorkspace.value = workspace
    }
  }

  return {
    workspaces,
    currentWorkspace,
    loading,
    hasWorkspaces,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setCurrentWorkspace,
  }
})
