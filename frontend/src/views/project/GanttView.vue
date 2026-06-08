<template>
  <v-container fluid class="pa-0">
    <v-row class="pa-4">
      <v-col cols="12" sm="6" md="3">
        <v-btn-toggle v-model="viewMode" mandatory class="mb-0">
          <v-btn value="day">Day</v-btn>
          <v-btn value="week">Week</v-btn>
          <v-btn value="month">Month</v-btn>
        </v-btn-toggle>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-btn color="primary" @click="showCreateTask = true" prepend-icon="mdi-plus">
          Add Task
        </v-btn>
      </v-col>
    </v-row>
    
    <div ref="ganttContainer" class="gantt-container"></div>

    <v-dialog v-model="showCreateTask" max-width="600px">
      <v-card>
        <v-card-title>Create New Task</v-card-title>
        <v-card-text>
          <v-form v-model="taskFormValid">
            <v-text-field
              v-model="newTask.title"
              label="Title"
              :rules="requiredRules"
              required
            ></v-text-field>
            <v-row>
              <v-col>
                <v-text-field
                  v-model="newTask.startDate"
                  label="Start Date"
                  type="date"
                ></v-text-field>
              </v-col>
              <v-col>
                <v-text-field
                  v-model="newTask.endDate"
                  label="End Date"
                  type="date"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-select
              v-model="newTask.status"
              label="Status"
              :items="statusItems"
            ></v-select>
            <v-slider
              v-model="newTask.progress"
              label="Progress"
              min="0"
              max="100"
              step="5"
              thumb-label
            ></v-slider>
            <v-textarea
              v-model="newTask.description"
              label="Description"
              rows="3"
            ></v-textarea>
            <v-select
              v-model="newTask.parentId"
              label="Parent Task (Optional)"
              :items="parentTaskItems"
              return-object="id"
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showCreateTask = false">Cancel</v-btn>
          <v-btn color="primary" @click="createTask" :disabled="!taskFormValid">
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showTaskDetail" max-width="600px">
      <v-card v-if="selectedTask">
        <v-card-title>
          {{ selectedTask.title }}
          <v-spacer></v-spacer>
          <v-btn icon @click="deleteSelectedTask">
            <v-icon color="error">mdi-delete</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-form v-model="editTaskFormValid">
            <v-text-field
              v-model="editTask.title"
              label="Title"
              :rules="requiredRules"
              required
            ></v-text-field>
            <v-row>
              <v-col>
                <v-text-field
                  v-model="editTask.startDate"
                  label="Start Date"
                  type="date"
                ></v-text-field>
              </v-col>
              <v-col>
                <v-text-field
                  v-model="editTask.endDate"
                  label="End Date"
                  type="date"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-select
              v-model="editTask.status"
              label="Status"
              :items="statusItems"
            ></v-select>
            <v-slider
              v-model="editTask.progress"
              label="Progress"
              min="0"
              max="100"
              step="5"
              thumb-label
            ></v-slider>
            <v-textarea
              v-model="editTask.description"
              label="Description (Markdown)"
              rows="5"
            ></v-textarea>
            <div v-if="editTask.description" class="mt-4">
              <div class="text-caption text-secondary mb-1">Preview:</div>
              <div class="markdown-preview" v-html="renderedDescription"></div>
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showTaskDetail = false">Close</v-btn>
          <v-btn color="primary" @click="updateTask" :disabled="!editTaskFormValid">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showTimeAdjustDialog" max-width="500px">
      <v-card>
        <v-card-title>Adjust Dependent Tasks</v-card-title>
        <v-card-text>
          <p>This task has dependent tasks. How would you like to handle them?</p>
          <v-radio-group v-model="adjustOption">
            <v-radio value="none" label="Don't adjust - only update this task"></v-radio>
            <v-radio value="auto" label="Automatically adjust dependent tasks"></v-radio>
          </v-radio-group>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showTimeAdjustDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmTimeChange">
            Continue
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import gantt from 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
import { useTaskStore } from '@/stores/task'
import { useProjectStore } from '@/stores/project'
import type { Task, TaskStatus, DependencyType } from '@/types'

const route = useRoute()
const taskStore = useTaskStore()
const projectStore = useProjectStore()

const ganttContainer = ref<HTMLElement | null>(null)
let ganttInstance: any = null

const viewMode = ref('week')
const showCreateTask = ref(false)
const showTaskDetail = ref(false)
const showTimeAdjustDialog = ref(false)
const selectedTask = ref<Task | null>(null)
const adjustOption = ref('none')
const pendingTimeChange = ref<{ id: string; startDate: string; endDate: string } | null>(null)

const taskFormValid = ref(false)
const editTaskFormValid = ref(false)

const newTask = ref({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  status: TaskStatus.TODO,
  progress: 0,
  parentId: '',
})

const editTask = ref({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  status: TaskStatus.TODO,
  progress: 0,
})

const requiredRules = [(v: any) => !!v || 'This field is required']

const statusItems = computed(() => [
  { value: 'TODO', title: 'To Do' },
  { value: 'IN_PROGRESS', title: 'In Progress' },
  { value: 'COMPLETED', title: 'Completed' },
  { value: 'BLOCKED', title: 'Blocked' },
])

const parentTaskItems = computed(() => {
  return taskStore.tasks
    .filter((t) => t.depth < 2)
    .map((t) => ({ value: t.id, title: t.title }))
})

const renderedDescription = computed(() => {
  if (!editTask.value.description) return ''
  return marked(editTask.value.description)
})

const criticalPath = computed(() => taskStore.getCriticalPath())

function initGantt() {
  if (!ganttContainer.value) return

  ganttInstance = gantt

  gantt.config.xml_date = '%Y-%m-%d'
  gantt.config.readonly = false
  gantt.config.drag_progress = true
  gantt.config.drag_resize = true
  gantt.config.drag_move = true
  gantt.config.order_branch = true
  gantt.config.show_grid = true
  gantt.config.show_tasks_outside_timescale = true

  gantt.config.columns = [
    { name: 'text', label: 'Task', width: 200, tree: true },
    { name: 'start_date', label: 'Start', width: 80, align: 'center' },
    { name: 'end_date', label: 'End', width: 80, align: 'center' },
    { name: 'progress', label: 'Progress', width: 80, align: 'center', template: (obj: any) => `${obj.progress}%` },
    { name: 'add', width: 44 },
  ]

  gantt.config.scales = [
    { unit: 'week', step: 1, format: '%W' },
    { unit: 'day', step: 1, format: '%d %M' },
  ]

  gantt.templates.scale_cell_class = (date: Date) => {
    if (date.getDay() === 0 || date.getDay() === 6) {
      return 'weekend'
    }
  }

  gantt.templates.task_class = (start: Date, end: Date, task: any) => {
    if (criticalPath.value.includes(task.id)) {
      return 'critical-path'
    }
    return ''
  }

  gantt.templates.leftside_text = (start: Date, end: Date, task: any) => {
    const isToday = (date: Date) => {
      const today = new Date()
      return date.toDateString() === today.toDateString()
    }
    if (isToday(start)) {
      return '<span class="today-marker">Today</span>'
    }
    return ''
  }

  gantt.attachEvent('onAfterTaskAdd', async (id: string, item: any) => {
    try {
      await taskStore.createTask({
        projectId: route.params.projectId,
        title: item.text,
        startDate: formatDate(item.start_date),
        endDate: formatDate(item.end_date),
        progress: item.progress || 0,
        parentId: item.parent || undefined,
      })
    } catch (e) {
      gantt.deleteTask(id)
    }
  })

  gantt.attachEvent('onAfterTaskUpdate', async (id: string, item: any) => {
    try {
      const originalTask = taskStore.tasksById.get(id)
      const originalStart = originalTask?.startDate
      const originalEnd = originalTask?.endDate
      const newStart = formatDate(item.start_date)
      const newEnd = formatDate(item.end_date)

      const hasDependents = taskStore.getTaskDependents(id).length > 0
      const timeChanged = (originalStart !== newStart || originalEnd !== newEnd)

      if (timeChanged && hasDependents) {
        pendingTimeChange.value = { id, startDate: newStart, endDate: newEnd }
        showTimeAdjustDialog.value = true
      } else {
        await taskStore.updateTask(id, {
          title: item.text,
          startDate: newStart,
          endDate: newEnd,
          progress: item.progress,
          parentId: item.parent || undefined,
        })
      }
    } catch (e) {
      console.error('Update failed:', e)
    }
  })

  gantt.attachEvent('onAfterTaskDelete', async (id: string) => {
    try {
      await taskStore.deleteTask(id)
    } catch (e) {
      console.error('Delete failed:', e)
    }
  })

  gantt.attachEvent('onAfterLinkAdd', async (id: string, link: any) => {
    try {
      const depTypeMap: Record<number, DependencyType> = {
        0: DependencyType.FS,
        1: DependencyType.SS,
        2: DependencyType.FF,
      }
      await taskStore.createDependency(link.source, link.target, depTypeMap[link.type] || DependencyType.FS)
    } catch (e) {
      gantt.deleteLink(id)
    }
  })

  gantt.attachEvent('onAfterLinkDelete', async (id: string) => {
    try {
      const dep = taskStore.dependencies.find(
        (d) => `${d.fromTaskId}-${d.toTaskId}` === id || d.id === id
      )
      if (dep) {
        await taskStore.deleteDependency(dep.id)
      }
    } catch (e) {
      console.error('Delete dependency failed:', e)
    }
  })

  gantt.attachEvent('onTaskDblClick', (id: string) => {
    const task = taskStore.tasksById.get(id)
    if (task) {
      openTaskDetail(task)
    }
    return false
  })

  gantt.init(ganttContainer.value)
}

function formatDate(date: Date | string): string {
  if (typeof date === 'string') return date
  return date.toISOString().split('T')[0]
}

function updateViewMode() {
  if (!ganttInstance) return

  switch (viewMode.value) {
    case 'day':
      gantt.config.scale_unit = 'day'
      gantt.config.date_scale = '%d %M'
      gantt.config.scales = [
        { unit: 'month', step: 1, format: '%F, %Y' },
        { unit: 'day', step: 1, format: '%d %D' },
      ]
      break
    case 'week':
      gantt.config.scale_unit = 'week'
      gantt.config.date_scale = 'Week %W'
      gantt.config.scales = [
        { unit: 'month', step: 1, format: '%F, %Y' },
        { unit: 'week', step: 1, format: 'Week %W' },
        { unit: 'day', step: 1, format: '%d' },
      ]
      break
    case 'month':
      gantt.config.scale_unit = 'month'
      gantt.config.date_scale = '%F'
      gantt.config.scales = [
        { unit: 'year', step: 1, format: '%Y' },
        { unit: 'month', step: 1, format: '%F' },
      ]
      break
  }

  ganttInstance.render()
}

function loadTasks() {
  if (!ganttInstance) return

  ganttInstance.clearAll()

  taskStore.tasks.forEach((task) => {
    ganttInstance.addTask({
      id: task.id,
      text: task.title,
      start_date: task.startDate ? new Date(task.startDate) : new Date(),
      end_date: task.endDate ? new Date(task.endDate) : new Date(Date.now() + 86400000),
      progress: task.progress / 100,
      parent: task.parentId || 0,
      open: true,
    })
  })

  const typeToGantt: Record<string, number> = {
    'FS': 0,
    'SS': 1,
    'FF': 2,
  }

  taskStore.dependencies.forEach((dep) => {
    ganttInstance.addLink({
      id: `${dep.fromTaskId}-${dep.toTaskId}`,
      source: dep.fromTaskId,
      target: dep.toTaskId,
      type: typeToGantt[dep.type] || 0,
    })
  })

  ganttInstance.render()
}

watch(viewMode, updateViewMode)

watch(() => taskStore.tasks, () => {
  nextTick(loadTasks)
}, { deep: true })

watch(() => taskStore.dependencies, () => {
  nextTick(loadTasks)
}, { deep: true })

onMounted(() => {
  nextTick(() => {
    initGantt()
    updateViewMode()
    loadTasks()
  })
})

function openTaskDetail(task: Task) {
  selectedTask.value = task
  editTask.value = {
    title: task.title,
    description: task.description || '',
    startDate: task.startDate?.split('T')[0] || '',
    endDate: task.endDate?.split('T')[0] || '',
    status: task.status,
    progress: task.progress,
  }
  showTaskDetail.value = true
}

async function createTask() {
  if (!taskFormValid.value) return

  await taskStore.createTask({
    projectId: route.params.projectId,
    ...newTask.value,
    parentId: newTask.value.parentId || undefined,
  })

  showCreateTask.value = false
  newTask.value = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: TaskStatus.TODO,
    progress: 0,
    parentId: '',
  }
}

async function updateTask() {
  if (!selectedTask.value || !editTaskFormValid.value) return

  await taskStore.updateTask(selectedTask.value.id, {
    ...editTask.value,
  })

  showTaskDetail.value = false
  selectedTask.value = null
}

async function deleteSelectedTask() {
  if (!selectedTask.value) return
  
  if (confirm('Are you sure you want to delete this task?')) {
    await taskStore.deleteTask(selectedTask.value.id)
    showTaskDetail.value = false
    selectedTask.value = null
  }
}

async function confirmTimeChange() {
  if (!pendingTimeChange.value) return

  await taskStore.updateTaskTime(
    pendingTimeChange.value.id,
    pendingTimeChange.value.startDate,
    pendingTimeChange.value.endDate,
    adjustOption.value
  )

  showTimeAdjustDialog.value = false
  pendingTimeChange.value = null
  adjustOption.value = 'none'
}
</script>

<style scoped>
.gantt-container {
  height: calc(100vh - 180px);
  width: 100%;
}

:deep(.weekend) {
  background-color: #f5f5f5 !important;
}

:deep(.critical-path .gantt_task_line) {
  background-color: #ff5252 !important;
  border-color: #d32f2f !important;
}

:deep(.today-marker) {
  color: #1976d2;
  font-weight: bold;
}

:deep(.markdown-preview) {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  background-color: #fafafa;
}

:deep(.markdown-preview h1) { font-size: 1.5rem; margin: 0 0 0.5rem 0; }
:deep(.markdown-preview h2) { font-size: 1.25rem; margin: 0 0 0.5rem 0; }
:deep(.markdown-preview p) { margin: 0 0 0.5rem 0; }
:deep(.markdown-preview ul, .markdown-preview ol) { margin: 0 0 0.5rem 1.5rem; }
:deep(.markdown-preview code) { background-color: #e0e0e0; padding: 2px 4px; border-radius: 3px; }
:deep(.markdown-preview pre) { background-color: #2d2d2d; color: #f8f8f2; padding: 12px; border-radius: 4px; overflow-x: auto; }
</style>
