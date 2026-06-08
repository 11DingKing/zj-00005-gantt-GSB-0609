import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { projectApi, milestoneApi, versionApi, invitationApi } from '@/api'
import type { Project, Milestone, Version, Invitation, Role } from '@/types'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const milestones = ref<Milestone[]>([])
  const versions = ref<Version[]>([])
  const invitations = ref<Invitation[]>([])
  const loading = ref(false)

  const hasProjects = computed(() => projects.value.length > 0)

  async function fetchProjects(workspaceId: string) {
    loading.value = true
    try {
      const result = await projectApi.getAll(workspaceId)
      projects.value = result.projects || []
    } finally {
      loading.value = false
    }
  }

  async function fetchProject(id: string) {
    loading.value = true
    try {
      currentProject.value = await projectApi.getOne(id)
    } finally {
      loading.value = false
    }
  }

  async function createProject(workspaceId: string, name: string, description?: string) {
    const project = await projectApi.create({ workspaceId, name, description })
    projects.value.unshift(project)
    return project
  }

  async function updateProject(id: string, data: { name?: string; description?: string }) {
    const project = await projectApi.update(id, data)
    const index = projects.value.findIndex((p) => p.id === id)
    if (index !== -1) {
      projects.value[index] = project
    }
    if (currentProject.value?.id === id) {
      currentProject.value = project
    }
    return project
  }

  async function deleteProject(id: string) {
    await projectApi.delete(id)
    projects.value = projects.value.filter((p) => p.id !== id)
    if (currentProject.value?.id === id) {
      currentProject.value = null
    }
  }

  async function fetchMilestones(projectId: string) {
    milestones.value = await milestoneApi.getAll(projectId)
  }

  async function createMilestone(data: any) {
    const milestone = await milestoneApi.create(data)
    milestones.value.push(milestone)
    return milestone
  }

  async function updateMilestone(id: string, data: any) {
    const milestone = await milestoneApi.update(id, data)
    const index = milestones.value.findIndex((m) => m.id === id)
    if (index !== -1) {
      milestones.value[index] = milestone
    }
    return milestone
  }

  async function deleteMilestone(id: string) {
    await milestoneApi.delete(id)
    milestones.value = milestones.value.filter((m) => m.id !== id)
  }

  async function fetchVersions(projectId: string) {
    versions.value = await versionApi.getAll(projectId)
  }

  async function createVersion(data: { projectId: string; version: string; milestoneId?: string; description?: string }) {
    const version = await versionApi.create(data)
    versions.value.unshift(version)
    return version
  }

  async function updateVersion(id: string, data: any) {
    const version = await versionApi.update(id, data)
    const index = versions.value.findIndex((v) => v.id === id)
    if (index !== -1) {
      versions.value[index] = version
    }
    return version
  }

  async function deleteVersion(id: string) {
    await versionApi.delete(id)
    versions.value = versions.value.filter((v) => v.id !== id)
  }

  async function fetchInvitations(projectId: string) {
    invitations.value = await invitationApi.getAll(projectId)
  }

  async function createInvitation(projectId: string, email: string, role: Role = Role.MEMBER) {
    const invitation = await invitationApi.create({ projectId, email, role })
    invitations.value.unshift(invitation)
    return invitation
  }

  async function cancelInvitation(id: string) {
    await invitationApi.delete(id)
    invitations.value = invitations.value.filter((i) => i.id !== id)
  }

  async function acceptInvitation(token: string) {
    return await invitationApi.accept(token)
  }

  async function updateMemberRole(projectId: string, memberId: string, role: Role) {
    const updated = await projectApi.updateMemberRole(projectId, memberId, role)
    if (currentProject.value) {
      const member = currentProject.value.members?.find((m) => m.id === memberId)
      if (member) {
        member.role = role
      }
    }
    return updated
  }

  async function removeMember(projectId: string, memberId: string) {
    await projectApi.removeMember(projectId, memberId)
    if (currentProject.value?.members) {
      currentProject.value.members = currentProject.value.members.filter((m) => m.id !== memberId)
    }
  }

  return {
    projects,
    currentProject,
    milestones,
    versions,
    invitations,
    loading,
    hasProjects,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    fetchMilestones,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    fetchVersions,
    createVersion,
    updateVersion,
    deleteVersion,
    fetchInvitations,
    createInvitation,
    cancelInvitation,
    acceptInvitation,
    updateMemberRole,
    removeMember,
  }
})
