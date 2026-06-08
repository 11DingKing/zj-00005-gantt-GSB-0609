<template>
  <v-container>
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h4">Workspaces</h1>
        <p class="text-secondary">Select a workspace to view your projects</p>
      </v-col>
    </v-row>

    <v-progress-linear v-if="workspaceStore.loading" indeterminate></v-progress-linear>

    <v-row v-else>
      <v-col v-if="workspaceStore.workspaces.length === 0" cols="12">
        <v-card>
          <v-card-text class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1">mdi-folder-multiple</v-icon>
            <p class="text-secondary mt-2">No workspaces yet. Create your first workspace to get started.</p>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col v-for="workspace in workspaceStore.workspaces" :key="workspace.id" cols="12" sm="6" md="4">
        <v-card
          class="cursor-pointer hover:elevation-8"
          @click="goToWorkspace(workspace.id)"
        >
          <v-card-title>{{ workspace.name }}</v-card-title>
          <v-card-text>
            <div class="text-secondary text-sm mb-2">
              <v-icon small>mdi-folder-outline</v-icon>
              {{ workspace._count?.projects || 0 }} projects
            </div>
            <div class="text-caption text-secondary">
              Created: {{ new Date(workspace.createdAt).toLocaleDateString() }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'

const router = useRouter()
const workspaceStore = useWorkspaceStore()

function goToWorkspace(workspaceId: string) {
  workspaceStore.setCurrentWorkspace(workspaceId)
  router.push({ name: 'ProjectList', params: { workspaceId } })
}
</script>
