<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="8" lg="6">
        <v-card>
          <v-card-title>Project Settings</v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-form v-model="formValid">
              <v-text-field
                v-model="form.name"
                label="Project Name"
                :rules="[requiredRule]"
                required
              ></v-text-field>

              <v-textarea
                v-model="form.description"
                label="Description"
                rows="3"
                auto-grow
              ></v-textarea>

              <v-alert
                v-if="projectStore.currentProject"
                border="start"
                color="info"
                variant="tonal"
                class="mt-4"
              >
                <template v-slot:prepend>
                  <v-icon>mdi-information</v-icon>
                </template>
                <strong>Project Info:</strong><br/>
                Created: {{ formatDate(projectStore.currentProject.createdAt) }}<br/>
                Tasks: {{ projectStore.currentProject._count?.tasks || 0 }}<br/>
                Members: {{ projectStore.currentProject._count?.members || 0 }}<br/>
                Milestones: {{ projectStore.currentProject._count?.milestones || 0 }}<br/>
                Versions: {{ projectStore.currentProject._count?.versions || 0 }}
              </v-alert>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              @click="saveProject"
              :disabled="!formValid || !hasChanges"
            >
              Save Changes
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="isOwnerOrAdmin" class="mt-4">
      <v-col cols="12" md="8" lg="6">
        <v-card class="border-error">
          <v-card-title class="text-error">Danger Zone</v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <p class="text-body-1 mb-4">
              Once you delete this project, there is no going back. Please be certain.
            </p>
            <v-btn
              color="error"
              @click="deleteDialog = true"
            >
              Delete Project
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title>Delete Project</v-card-title>
        <v-card-text>
          <p class="text-body-1 mb-2">
            Are you absolutely sure you want to delete this project?
          </p>
          <p class="text-body-1 mb-4">
            This action <strong>cannot</strong> be undone. This will permanently delete:
          </p>
          <ul class="ml-4">
            <li>All tasks and dependencies</li>
            <li>All milestones</li>
            <li>All versions</li>
            <li>All team members and invitations</li>
          </ul>
          <v-text-field
            v-model="confirmText"
            label="Type the project name to confirm"
            class="mt-4"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="error"
            @click="confirmDelete"
            :disabled="confirmText !== projectStore.currentProject?.name"
          >
            Delete Project
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useAuthStore } from '@/stores/auth'
import { Role } from '@/types'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const authStore = useAuthStore()

const formValid = ref(false)
const deleteDialog = ref(false)
const confirmText = ref('')

const form = ref({
  name: '',
  description: '',
})

const originalForm = ref({
  name: '',
  description: '',
})

const requiredRule = [(v: string) => !!v || 'Required']

const hasChanges = computed(() => {
  return (
    form.value.name !== originalForm.value.name ||
    form.value.description !== originalForm.value.description
  )
})

const currentUserRole = computed(() => {
  const userId = authStore.user?.id
  if (!userId || !projectStore.currentProject?.members) return Role.VIEWER
  
  const member = projectStore.currentProject.members.find((m) => m.userId === userId)
  return member?.role || Role.VIEWER
})

const isOwnerOrAdmin = computed(() => {
  return currentUserRole.value === Role.OWNER || currentUserRole.value === Role.ADMIN
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

watch(() => projectStore.currentProject, (project) => {
  if (project) {
    form.value.name = project.name
    form.value.description = project.description || ''
    originalForm.value.name = project.name
    originalForm.value.description = project.description || ''
  }
}, { immediate: true })

async function saveProject() {
  if (!projectStore.currentProject) return
  
  try {
    await projectStore.updateProject(projectStore.currentProject.id, {
      name: form.value.name,
      description: form.value.description,
    })
    originalForm.value.name = form.value.name
    originalForm.value.description = form.value.description
  } catch (error) {
    console.error('Failed to update project:', error)
  }
}

async function confirmDelete() {
  if (!projectStore.currentProject) return
  
  try {
    const workspaceId = projectStore.currentProject.workspaceId
    await projectStore.deleteProject(projectStore.currentProject.id)
    deleteDialog.value = false
    router.push({ name: 'ProjectList', params: { workspaceId } })
  } catch (error) {
    console.error('Failed to delete project:', error)
  }
}

onMounted(() => {
  const projectId = route.params.projectId as string
  if (projectId && !projectStore.currentProject) {
    projectStore.fetchProject(projectId)
  }
})
</script>
