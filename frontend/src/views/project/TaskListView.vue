<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <h2 class="text-h5 ma-0">Tasks</h2>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
          New Task
        </v-btn>
      </v-col>
    </v-row>

    <v-card>
      <v-toolbar flat density="comfortable">
        <v-text-field
          v-model="searchQuery"
          label="Search tasks..."
          density="compact"
          hide-details
          prepend-inner-icon="mdi-magnify"
          clearable
          class="ma-2"
          style="max-width: 300px"
        ></v-text-field>
        <v-spacer></v-spacer>
        <v-select
          v-model="statusFilter"
          label="Status"
          density="compact"
          hide-details
          :items="statusOptions"
          clearable
          class="ma-2"
          style="max-width: 150px"
        ></v-select>
        <v-btn icon @click="expandAll = !expandAll">
          <v-icon>{{ expandAll ? 'mdi-arrow-collapse-all' : 'mdi-arrow-expand-all' }}</v-icon>
        </v-btn>
      </v-toolbar>

      <v-divider></v-divider>

      <v-data-table
        :headers="headers"
        :items="filteredTasks"
        :loading="taskStore.loading"
        show-expand
        item-key="id"
        :expanded.sync="expandedItems"
        density="compact"
      >
        <template v-slot:item.title="{ item }">
          <div
            class="d-flex align-center"
            :style="{ paddingLeft: item.depth * 20 + 'px' }"
          >
            <v-icon
              v-if="hasChildren(item.id)"
              class="mr-2 clickable"
              @click="toggleExpand(item.id)"
              small
            >
              {{ isExpanded(item.id) ? 'mdi-minus' : 'mdi-plus' }}
            </v-icon>
            <v-icon v-else class="mr-2 opacity-0" small>
              mdi-minus
            </v-icon>
            <v-icon
              :color="getStatusColor(item.status)"
              small
              class="mr-2"
            >
              {{ getStatusIcon(item.status) }}
            </v-icon>
            <span class="font-medium">{{ item.title }}</span>
          </div>
        </template>

        <template v-slot:item.progress="{ item }">
          <v-progress-linear
            :model-value="item.progress"
            :color="getProgressColor(item.progress)"
            height="8"
            rounded
          >
            <template v-slot:default="{ value }">
              <strong>{{ value }}%</strong>
            </template>
          </v-progress-linear>
        </template>

        <template v-slot:item.status="{ item }">
          <v-chip
            :color="getStatusColor(item.status)"
            size="small"
            variant="flat"
          >
            {{ item.status }}
          </v-chip>
        </template>

        <template v-slot:item.assignees="{ item }">
          <v-tooltip
            v-for="assignee in item.assignees"
            :key="assignee.id"
            location="bottom"
          >
            <template v-slot:activator="{ props }">
              <v-avatar
                v-bind="props"
                size="24"
                class="ml-n2 first:ml-0"
                :title="assignee.user.name || assignee.user.username"
              >
                <v-img
                  v-if="assignee.user.avatar"
                  :src="assignee.user.avatar"
                ></v-img>
                <span v-else class="text-caption">
                  {{ (assignee.user.name || assignee.user.username).charAt(0).toUpperCase() }}
                </span>
              </v-avatar>
            </template>
            <span>{{ assignee.user.name || assignee.user.username }}</span>
          </v-tooltip>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn icon density="compact" @click="editTask(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon density="compact" color="error" @click="deleteTask(item)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="taskDialog" max-width="700px">
      <v-card>
        <v-card-title>
          {{ editingTask ? 'Edit Task' : 'Create Task' }}
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="taskDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-form v-model="formValid">
            <v-text-field
              v-model="taskForm.title"
              label="Title"
              :rules="[requiredRule]"
              required
            ></v-text-field>

            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="taskForm.startDate"
                  label="Start Date"
                  type="date"
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="taskForm.endDate"
                  label="End Date"
                  type="date"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="6">
                <v-select
                  v-model="taskForm.status"
                  label="Status"
                  :items="statusOptions"
                ></v-select>
              </v-col>
              <v-col cols="6">
                <v-slider
                  v-model="taskForm.progress"
                  label="Progress"
                  min="0"
                  max="100"
                  step="5"
                  thumb-label
                  show-ticks
                ></v-slider>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="6">
                <v-select
                  v-model="taskForm.parentId"
                  label="Parent Task"
                  :items="parentTaskOptions"
                  clearable
                ></v-select>
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="taskForm.assigneeIds"
                  label="Assignees"
                  :items="memberOptions"
                  multiple
                  chips
                ></v-select>
              </v-col>
            </v-row>

            <v-textarea
              v-model="taskForm.description"
              label="Description (Markdown)"
              rows="4"
              auto-grow
            ></v-textarea>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="taskDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveTask" :disabled="!formValid">
            {{ editingTask ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title>Delete Task</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ taskToDelete?.title }}"? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { useProjectStore } from '@/stores/project'
import { TaskStatus, Role } from '@/types'
import type { Task } from '@/types'

const route = useRoute()
const taskStore = useTaskStore()
const projectStore = useProjectStore()

const searchQuery = ref('')
const statusFilter = ref<TaskStatus | ''>('')
const expandAll = ref(false)
const expandedItems = ref<string[]>([])

const taskDialog = ref(false)
const formValid = ref(false)
const editingTask = ref<Task | null>(null)
const deleteDialog = ref(false)
const taskToDelete = ref<Task | null>(null)

const taskForm = ref({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  status: TaskStatus.TODO,
  progress: 0,
  parentId: '' as string | undefined,
  assigneeIds: [] as string[],
})

const requiredRule = [(v: string) => !!v || 'Required']

const statusOptions = [
  { title: 'Todo', value: TaskStatus.TODO },
  { title: 'In Progress', value: TaskStatus.IN_PROGRESS },
  { title: 'Completed', value: TaskStatus.COMPLETED },
  { title: 'Blocked', value: TaskStatus.BLOCKED },
]

const headers = [
  { title: 'Title', key: 'title', width: '35%' },
  { title: 'Progress', key: 'progress', width: '15%' },
  { title: 'Status', key: 'status', width: '12%' },
  { title: 'Start', key: 'startDate', width: '12%' },
  { title: 'End', key: 'endDate', width: '12%' },
  { title: 'Assignees', key: 'assignees', width: '10%' },
  { title: 'Actions', key: 'actions', width: '8%', sortable: false },
]

const memberOptions = computed(() => {
  const members = projectStore.currentProject?.members || []
  return members.map((m) => ({
    title: m.user.name || m.user.username,
    value: m.user.id,
  }))
})

const parentTaskOptions = computed(() => {
  const projectId = route.params.projectId as string
  const tasks = taskStore.tasks.filter((t) => t.projectId === projectId)
  
  if (editingTask.value) {
    const editingId = editingTask.value.id
    return tasks
      .filter((t) => t.id !== editingId && t.depth < 2)
      .map((t) => ({
        title: '  '.repeat(t.depth) + t.title,
        value: t.id,
      }))
  }
  
  return tasks
    .filter((t) => t.depth < 2)
    .map((t) => ({
      title: '  '.repeat(t.depth) + t.title,
      value: t.id,
    }))
})

const filteredTasks = computed(() => {
  let tasks = [...taskStore.tasks]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    tasks = tasks.filter((t) => t.title.toLowerCase().includes(query))
  }

  if (statusFilter.value) {
    tasks = tasks.filter((t) => t.status === statusFilter.value)
  }

  return tasks.sort((a, b) => a.orderIndex - b.orderIndex)
})

function hasChildren(taskId: string): boolean {
  return taskStore.tasks.some((t) => t.parentId === taskId)
}

function isExpanded(taskId: string): boolean {
  return expandedItems.value.includes(taskId)
}

function toggleExpand(taskId: string) {
  const index = expandedItems.value.indexOf(taskId)
  if (index === -1) {
    expandedItems.value.push(taskId)
  } else {
    expandedItems.value.splice(index, 1)
  }
}

watch(expandAll, (expand) => {
  if (expand) {
    expandedItems.value = taskStore.tasks
      .filter((t) => hasChildren(t.id))
      .map((t) => t.id)
  } else {
    expandedItems.value = []
  }
})

function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: 'grey',
    [TaskStatus.IN_PROGRESS]: 'primary',
    [TaskStatus.COMPLETED]: 'success',
    [TaskStatus.BLOCKED]: 'error',
  }
  return colors[status] || 'grey'
}

function getStatusIcon(status: TaskStatus): string {
  const icons: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: 'mdi-circle-outline',
    [TaskStatus.IN_PROGRESS]: 'mdi-play-circle-outline',
    [TaskStatus.COMPLETED]: 'mdi-check-circle',
    [TaskStatus.BLOCKED]: 'mdi-alert-circle',
  }
  return icons[status] || 'mdi-circle-outline'
}

function getProgressColor(progress: number): string {
  if (progress >= 100) return 'success'
  if (progress >= 70) return 'primary'
  if (progress >= 30) return 'warning'
  return 'grey'
}

function openCreateDialog() {
  editingTask.value = null
  taskForm.value = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: TaskStatus.TODO,
    progress: 0,
    parentId: undefined,
    assigneeIds: [],
  }
  taskDialog.value = true
}

function editTask(task: Task) {
  editingTask.value = task
  taskForm.value = {
    title: task.title,
    description: task.description || '',
    startDate: task.startDate ? task.startDate.substring(0, 10) : '',
    endDate: task.endDate ? task.endDate.substring(0, 10) : '',
    status: task.status,
    progress: task.progress,
    parentId: task.parentId || undefined,
    assigneeIds: task.assignees.map((a) => a.user.id),
  }
  taskDialog.value = true
}

async function saveTask() {
  const projectId = route.params.projectId as string
  
  try {
    if (editingTask.value) {
      await taskStore.updateTask(editingTask.value.id, {
        ...taskForm.value,
        projectId,
      })
    } else {
      await taskStore.createTask({
        ...taskForm.value,
        projectId,
      })
    }
    taskDialog.value = false
    await taskStore.fetchTasks(projectId)
  } catch (error) {
    console.error('Failed to save task:', error)
  }
}

function deleteTask(task: Task) {
  taskToDelete.value = task
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!taskToDelete.value) return
  
  try {
    await taskStore.deleteTask(taskToDelete.value.id)
    deleteDialog.value = false
    const projectId = route.params.projectId as string
    await taskStore.fetchTasks(projectId)
  } catch (error) {
    console.error('Failed to delete task:', error)
  }
}

onMounted(() => {
  const projectId = route.params.projectId as string
  if (projectId && taskStore.tasks.length === 0) {
    taskStore.fetchTasks(projectId)
  }
})
</script>
