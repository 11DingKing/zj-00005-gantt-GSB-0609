import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guest: true },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'WorkspaceList',
          component: () => import('@/views/workspace/WorkspaceList.vue'),
        },
        {
          path: 'workspace/:workspaceId',
          name: 'ProjectList',
          component: () => import('@/views/project/ProjectList.vue'),
        },
      ],
    },
    {
      path: '/project/:projectId',
      name: 'Project',
      component: () => import('@/views/project/ProjectView.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Gantt',
          component: () => import('@/views/project/GanttView.vue'),
        },
        {
          path: 'tasks',
          name: 'TaskList',
          component: () => import('@/views/project/TaskListView.vue'),
        },
        {
          path: 'milestones',
          name: 'Milestones',
          component: () => import('@/views/project/MilestonesView.vue'),
        },
        {
          path: 'versions',
          name: 'Versions',
          component: () => import('@/views/project/VersionsView.vue'),
        },
        {
          path: 'team',
          name: 'Team',
          component: () => import('@/views/project/TeamView.vue'),
        },
        {
          path: 'settings',
          name: 'ProjectSettings',
          component: () => import('@/views/project/SettingsView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' })
  } else if (to.meta.guest && isAuthenticated) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
