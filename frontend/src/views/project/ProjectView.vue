<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-btn icon to="/dashboard">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-toolbar-title v-if="projectStore.currentProject">
        {{ projectStore.currentProject.name }}
      </v-toolbar-title>
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

    <v-tabs app v-model="tab" :items="tabs"></v-tabs>

    <v-main>
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/project'
import { useTaskStore } from '@/stores/task'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const projectStore = useProjectStore()
const taskStore = useTaskStore()

const tab = ref(0)

const tabs = computed(() => [
  { title: 'Gantt', to: { name: 'Gantt', params: route.params } },
  { title: 'Tasks', to: { name: 'TaskList', params: route.params } },
  { title: 'Milestones', to: { name: 'Milestones', params: route.params } },
  { title: 'Versions', to: { name: 'Versions', params: route.params } },
  { title: 'Team', to: { name: 'Team', params: route.params } },
  { title: 'Settings', to: { name: 'ProjectSettings', params: route.params } },
])

const routeNameToTab: Record<string, number> = {
  'Gantt': 0,
  'TaskList': 1,
  'Milestones': 2,
  'Versions': 3,
  'Team': 4,
  'ProjectSettings': 5,
}

watch(() => route.name, (name) => {
  if (name && routeNameToTab[name] !== undefined) {
    tab.value = routeNameToTab[name]
  }
}, { immediate: true })

watch(tab, (index) => {
  if (tabs.value[index]) {
    router.push(tabs.value[index].to)
  }
})

onMounted(async () => {
  const projectId = route.params.projectId as string
  if (projectId) {
    await projectStore.fetchProject(projectId)
    await taskStore.fetchTasks(projectId)
    await projectStore.fetchMilestones(projectId)
    await projectStore.fetchVersions(projectId)
  }
})

onUnmounted(() => {
  taskStore.disconnectWebSocket()
})

function logout() {
  authStore.logout()
  router.push({ name: 'Login' })
}
</script>
