<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <h2 class="text-h5 ma-0">Milestones</h2>
        <v-btn color="primary" prepend-icon="mdi-flag" @click="openCreateDialog">
          New Milestone
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col
        v-for="milestone in sortedMilestones"
        :key="milestone.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card :class="{ 'opacity-75': isPast(milestone.date) }">
          <v-card-item>
            <v-avatar
              :color="getMilestoneColor(milestone)"
              size="40"
              class="mr-3"
            >
              <v-icon>mdi-flag</v-icon>
            </v-avatar>
            <v-card-title class="text-headline-6">
              {{ milestone.title }}
            </v-card-title>
            <v-card-subtitle>
              {{ formatDate(milestone.date) }}
              <v-chip
                v-if="isPast(milestone.date)"
                size="small"
                variant="flat"
                color="success"
                class="ml-2"
              >
                Completed
              </v-chip>
              <v-chip
                v-else-if="isUpcoming(milestone.date)"
                size="small"
                variant="flat"
                color="warning"
                class="ml-2"
              >
                Upcoming
              </v-chip>
            </v-card-subtitle>
          </v-card-item>

          <v-card-text v-if="milestone.description">
            <p class="text-subtitle-2 mb-2">Description</p>
            <p class="text-body-2">{{ milestone.description }}</p>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-item>
            <v-card-subtitle>
              Associated Tasks ({{ milestone.tasks?.length || 0 }})
            </v-card-subtitle>
          </v-card-item>

          <v-card-text class="pt-0">
            <div
              v-if="milestone.tasks && milestone.tasks.length > 0"
              class="space-y-2"
            >
              <div
                v-for="task in milestone.tasks"
                :key="task.id"
                class="d-flex align-center justify-between py-1"
              >
                <div class="d-flex align-center">
                  <v-icon
                    :color="getStatusColor(task.status)"
                    size="small"
                    class="mr-2"
                  >
                    {{ getStatusIcon(task.status) }}
                  </v-icon>
                  <span class="text-body-2">{{ task.task.title }}</span>
                </div>
                <span class="text-caption text-medium-emphasis">
                  {{ task.task.progress }}%
                </span>
              </div>
            </div>
            <p v-else class="text-body-2 text-medium-emphasis">
              No tasks associated
            </p>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              icon
              variant="text"
              @click="editMilestone(milestone)"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="error"
              @click="deleteMilestone(milestone)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col
        v-if="sortedMilestones.length === 0"
        cols="12"
        class="text-center py-10"
      >
        <v-icon size="64" class="text-medium-emphasis mb-4">
          mdi-flag-outline
        </v-icon>
        <p class="text-h6 text-medium-emphasis">No milestones yet</p>
        <p class="text-body-1 text-medium-emphasis mb-4">
          Create milestones to track important project dates
        </p>
        <v-btn color="primary" @click="openCreateDialog">
          Create First Milestone
        </v-btn>
      </v-col>
    </v-row>

    <v-dialog v-model="milestoneDialog" max-width="600px">
      <v-card>
        <v-card-title>
          {{ editingMilestone ? 'Edit Milestone' : 'Create Milestone' }}
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="milestoneDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-form v-model="formValid">
            <v-text-field
              v-model="milestoneForm.title"
              label="Title"
              :rules="[requiredRule]"
              required
            ></v-text-field>

            <v-text-field
              v-model="milestoneForm.date"
              label="Date"
              type="date"
              :rules="[requiredRule]"
              required
            ></v-text-field>

            <v-textarea
              v-model="milestoneForm.description"
              label="Description"
              rows="3"
            ></v-textarea>

            <v-select
              v-model="milestoneForm.taskIds"
              label="Associate Tasks"
              :items="taskOptions"
              multiple
              chips
              return-object
            >
              <template v-slot:selection="{ item, index }">
                <v-chip
                  :key="index"
                  :model-value="true"
                  size="small"
                  @click:close="removeTask(item)"
                >
                  {{ item.title }}
                </v-chip>
              </template>
            </v-select>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="milestoneDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveMilestone" :disabled="!formValid">
            {{ editingMilestone ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title>Delete Milestone</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ milestoneToDelete?.title }}"? This action cannot be undone.
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useTaskStore } from '@/stores/task'
import { TaskStatus } from '@/types'
import type { Milestone } from '@/types'

const route = useRoute()
const projectStore = useProjectStore()
const taskStore = useTaskStore()

const milestoneDialog = ref(false)
const formValid = ref(false)
const editingMilestone = ref<Milestone | null>(null)
const deleteDialog = ref(false)
const milestoneToDelete = ref<Milestone | null>(null)

const milestoneForm = ref({
  title: '',
  date: '',
  description: '',
  taskIds: [] as { id: string; title: string }[],
})

const requiredRule = [(v: string) => !!v || 'Required']

const sortedMilestones = computed(() => {
  return [...projectStore.milestones].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
})

const taskOptions = computed(() => {
  return taskStore.tasks.map((t) => ({
    id: t.id,
    title: '  '.repeat(t.depth) + t.title,
  }))
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function isPast(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

function isUpcoming(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  return date >= today && date <= nextWeek
}

function getMilestoneColor(milestone: Milestone): string {
  if (isPast(milestone.date)) {
    return 'success'
  }
  if (isUpcoming(milestone.date)) {
    return 'warning'
  }
  return 'primary'
}

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

function openCreateDialog() {
  editingMilestone.value = null
  milestoneForm.value = {
    title: '',
    date: '',
    description: '',
    taskIds: [],
  }
  milestoneDialog.value = true
}

function editMilestone(milestone: Milestone) {
  editingMilestone.value = milestone
  milestoneForm.value = {
    title: milestone.title,
    date: milestone.date.substring(0, 10),
    description: milestone.description || '',
    taskIds: (milestone.tasks || []).map((t) => ({
      id: t.task.id,
      title: t.task.title,
    })),
  }
  milestoneDialog.value = true
}

function removeTask(item: { id: string; title: string }) {
  const index = milestoneForm.value.taskIds.findIndex((t) => t.id === item.id)
  if (index !== -1) {
    milestoneForm.value.taskIds.splice(index, 1)
  }
}

async function saveMilestone() {
  const projectId = route.params.projectId as string
  const taskIds = milestoneForm.value.taskIds.map((t) => t.id)

  try {
    if (editingMilestone.value) {
      await projectStore.updateMilestone(editingMilestone.value.id, {
        title: milestoneForm.value.title,
        date: milestoneForm.value.date,
        description: milestoneForm.value.description,
        taskIds,
      })
    } else {
      await projectStore.createMilestone({
        projectId,
        title: milestoneForm.value.title,
        date: milestoneForm.value.date,
        description: milestoneForm.value.description,
        taskIds,
      })
    }
    milestoneDialog.value = false
  } catch (error) {
    console.error('Failed to save milestone:', error)
  }
}

function deleteMilestone(milestone: Milestone) {
  milestoneToDelete.value = milestone
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!milestoneToDelete.value) return

  try {
    await projectStore.deleteMilestone(milestoneToDelete.value.id)
    deleteDialog.value = false
  } catch (error) {
    console.error('Failed to delete milestone:', error)
  }
}

onMounted(() => {
  const projectId = route.params.projectId as string
  if (projectId && projectStore.milestones.length === 0) {
    projectStore.fetchMilestones(projectId)
  }
})
</script>
