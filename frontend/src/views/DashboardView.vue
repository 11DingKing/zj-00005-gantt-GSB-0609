<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>Gantt PM</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props">
            <v-icon>mdi-account</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item>
            <v-list-item-title>{{ authStore.user?.name || authStore.user?.username }}</v-list-item-title>
            <v-list-item-subtitle>{{ authStore.user?.email }}</v-list-item-subtitle>
          </v-list-item>
          <v-divider></v-divider>
          <v-list-item @click="logout">
            <v-list-item-icon>
              <v-icon>mdi-logout</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" app fixed>
      <v-list>
        <v-list-item @click="goToDashboard">
          <v-list-item-icon>
            <v-icon>mdi-view-dashboard</v-icon>
          </v-list-item-icon>
          <v-list-item-title>Dashboard</v-list-item-title>
        </v-list-item>
        <v-divider></v-divider>
        <v-subheader>Workspaces</v-subheader>
        <v-list-item
          v-for="workspace in workspaceStore.workspaces"
          :key="workspace.id"
          :active="$route.params.workspaceId === workspace.id"
          @click="goToWorkspace(workspace.id)"
        >
          <v-list-item-icon>
            <v-icon>mdi-folder-multiple</v-icon>
          </v-list-item-icon>
          <v-list-item-title>{{ workspace.name }}</v-list-item-title>
        </v-list-item>
        <v-list-item @click="showCreateWorkspace = true">
          <v-list-item-icon>
            <v-icon>mdi-plus</v-icon>
          </v-list-item-icon>
          <v-list-item-title>New Workspace</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view></router-view>
    </v-main>

    <v-dialog v-model="showCreateWorkspace" max-width="500px">
      <v-card>
        <v-card-title>Create New Workspace</v-card-title>
        <v-card-text>
          <v-form v-model="workspaceFormValid">
            <v-text-field
              v-model="newWorkspaceName"
              label="Workspace Name"
              :rules="requiredRules"
              required
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showCreateWorkspace = false">Cancel</v-btn>
          <v-btn color="primary" @click="createWorkspace" :disabled="!workspaceFormValid">
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const router = useRouter()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()

const drawer = ref(true)
const showCreateWorkspace = ref(false)
const newWorkspaceName = ref('')
const workspaceFormValid = ref(false)

const requiredRules = [(v: any) => !!v || 'This field is required']

onMounted(async () => {
  if (!authStore.user) {
    await authStore.fetchCurrentUser()
  }
  await workspaceStore.fetchWorkspaces()
})

function logout() {
  authStore.logout()
  router.push({ name: 'Login' })
}

function goToDashboard() {
  router.push({ name: 'WorkspaceList' })
}

function goToWorkspace(workspaceId: string) {
  router.push({ name: 'ProjectList', params: { workspaceId } })
}

async function createWorkspace() {
  if (!workspaceFormValid.value) return
  
  await workspaceStore.createWorkspace(newWorkspaceName.value)
  showCreateWorkspace.value = false
  newWorkspaceName.value = ''
  
  if (workspaceStore.currentWorkspace) {
    router.push({ name: 'ProjectList', params: { workspaceId: workspaceStore.currentWorkspace.id } })
  }
}
</script>
