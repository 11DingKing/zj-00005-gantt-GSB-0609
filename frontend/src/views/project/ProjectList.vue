<template>
  <v-container>
    <v-row class="mb-4 align-center">
      <v-col>
        <h1 class="text-h4">Projects</h1>
        <p class="text-secondary">Workspace: {{ workspaceStore.currentWorkspace?.name }}</p>
      </v-col>
      <v-col cols="auto">
        <v-btn color="primary" @click="showCreateProject = true" prepend-icon="mdi-plus">
          New Project
        </v-btn>
      </v-col>
    </v-row>

    <v-progress-linear v-if="projectStore.loading" indeterminate></v-progress-linear>

    <v-row v-else>
      <v-col v-if="projectStore.projects.length === 0" cols="12">
        <v-card>
          <v-card-text class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1">mdi-folder</v-icon>
            <p class="text-secondary mt-2">No projects yet. Create your first project to get started.</p>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col v-for="project in projectStore.projects" :key="project.id" cols="12" sm="6" md="4">
        <v-card
          class="cursor-pointer hover:elevation-8"
          @click="goToProject(project.id)"
        >
          <v-card-title>{{ project.name }}</v-card-title>
          <v-card-text>
            <p v-if="project.description" class="text-secondary mb-2 text-truncate">
              {{ project.description }}
            </p>
            <div class="d-flex align-center gap-4 text-sm text-secondary">
              <span>
                <v-icon small>mdi-account-multiple</v-icon>
                {{ project._count?.members || 0 }}
              </span>
              <span>
                <v-icon small>mdi-clipboard-list</v-icon>
                {{ project._count?.tasks || 0 }}
              </span>
              <span>
                <v-icon small>mdi-flag</v-icon>
                {{ project._count?.milestones || 0 }}
              </span>
            </div>
            <div class="text-caption text-secondary mt-2">
              Created: {{ new Date(project.createdAt).toLocaleDateString() }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="showCreateProject" max-width="600px">
      <v-card>
        <v-card-title>Create New Project</v-card-title>
        <v-card-text>
          <v-form v-model="projectFormValid">
            <v-text-field
              v-model="newProjectName"
              label="Project Name"
              :rules="requiredRules"
              required
            ></v-text-field>
            <v-textarea
              v-model="newProjectDescription"
              label="Description (Optional)"
              rows="3"
            ></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showCreateProject = false">Cancel</v-btn>
          <v-btn color="primary" @click="createProject" :disabled="!projectFormValid">
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useProjectStore } from '@/stores/project'

const router = useRouter()
const route = useRoute()
const workspaceStore = useWorkspaceStore()
const projectStore = useProjectStore()

const showCreateProject = ref(false)
const newProjectName = ref('')
const newProjectDescription = ref('')
const projectFormValid = ref(false)

const requiredRules = [(v: any) => !!v || 'This field is required']

watch(() => route.params.workspaceId, (workspaceId) => {
  if (workspaceId) {
    workspaceStore.setCurrentWorkspace(workspaceId as string)
    projectStore.fetchProjects(workspaceId as string)
  }
}, { immediate: true })

onMounted(async () => {
  if (workspaceStore.workspaces.length === 0) {
    await workspaceStore.fetchWorkspaces()
  }
  
  const workspaceId = route.params.workspaceId as string
  if (workspaceId) {
    workspaceStore.setCurrentWorkspace(workspaceId)
    await projectStore.fetchProjects(workspaceId)
  }
})

function goToProject(projectId: string) {
  router.push({ name: 'Gantt', params: { projectId } })
}

async function createProject() {
  if (!projectFormValid.value || !workspaceStore.currentWorkspace) return
  
  await projectStore.createProject(
    workspaceStore.currentWorkspace.id,
    newProjectName.value,
    newProjectDescription.value || undefined
  )
  
  showCreateProject.value = false
  newProjectName.value = ''
  newProjectDescription.value = ''
  
  await projectStore.fetchProjects(workspaceStore.currentWorkspace.id)
}
</script>
