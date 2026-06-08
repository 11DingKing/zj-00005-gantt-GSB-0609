<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <h2 class="text-h5 ma-0">Versions</h2>
        <v-btn color="primary" prepend-icon="mdi-tag" @click="openCreateDialog">
          New Version
        </v-btn>
      </v-col>
    </v-row>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="sortedVersions"
        :loading="projectStore.loading"
        item-key="id"
      >
        <template v-slot:item.version="{ item }">
          <div class="d-flex align-center">
            <v-icon color="primary" class="mr-2">
              mdi-tag
            </v-icon>
            <span class="font-medium">{{ item.version }}</span>
          </div>
        </template>

        <template v-slot:item.milestone="{ item }">
          <v-chip
            v-if="item.milestone"
            size="small"
            variant="flat"
            prepend-icon="mdi-flag"
            color="primary"
          >
            {{ item.milestone.title }}
          </v-chip>
          <span v-else class="text-medium-emphasis">-</span>
        </template>

        <template v-slot:item.createdAt="{ item }">
          {{ formatDate(item.createdAt) }}
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn icon density="compact" @click="editVersion(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon density="compact" color="error" @click="deleteVersion(item)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-data-table>

      <v-alert
        v-if="projectStore.versions.length === 0"
        border="start"
        color="info"
        variant="tonal"
        class="ma-4"
      >
        <template v-slot:prepend>
          <v-icon>mdi-information</v-icon>
        </template>
        No versions yet. Create a version to track your software releases.
      </v-alert>
    </v-card>

    <v-dialog v-model="versionDialog" max-width="500px">
      <v-card>
        <v-card-title>
          {{ editingVersion ? 'Edit Version' : 'Create Version' }}
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="versionDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-form v-model="formValid">
            <v-text-field
              v-model="versionForm.version"
              label="Version"
              :rules="[requiredRule]"
              required
              placeholder="e.g., v1.0.0"
            ></v-text-field>

            <v-select
              v-model="versionForm.milestoneId"
              label="Associated Milestone"
              :items="milestoneOptions"
              clearable
              item-value="id"
              item-title="title"
            ></v-select>

            <v-textarea
              v-model="versionForm.description"
              label="Release Notes"
              rows="4"
              auto-grow
            ></v-textarea>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="versionDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveVersion" :disabled="!formValid">
            {{ editingVersion ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title>Delete Version</v-card-title>
        <v-card-text>
          Are you sure you want to delete version "{{ versionToDelete?.version }}"? This action cannot be undone.
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
import type { Version, Milestone } from '@/types'

const route = useRoute()
const projectStore = useProjectStore()

const versionDialog = ref(false)
const formValid = ref(false)
const editingVersion = ref<Version | null>(null)
const deleteDialog = ref(false)
const versionToDelete = ref<Version | null>(null)

const versionForm = ref({
  version: '',
  milestoneId: '' as string | undefined,
  description: '',
})

const requiredRule = [(v: string) => !!v || 'Required']

const headers = [
  { title: 'Version', key: 'version', width: '25%' },
  { title: 'Milestone', key: 'milestone', width: '25%' },
  { title: 'Description', key: 'description', width: '30%' },
  { title: 'Created', key: 'createdAt', width: '12%' },
  { title: 'Actions', key: 'actions', width: '8%', sortable: false },
]

const milestoneOptions = computed(() => {
  return projectStore.milestones.map((m: Milestone) => ({
    id: m.id,
    title: `${m.title} (${formatDate(m.date)})`,
  }))
})

const sortedVersions = computed(() => {
  return [...projectStore.versions].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function openCreateDialog() {
  editingVersion.value = null
  versionForm.value = {
    version: '',
    milestoneId: undefined,
    description: '',
  }
  versionDialog.value = true
}

function editVersion(version: Version) {
  editingVersion.value = version
  versionForm.value = {
    version: version.version,
    milestoneId: version.milestoneId || undefined,
    description: version.description || '',
  }
  versionDialog.value = true
}

async function saveVersion() {
  const projectId = route.params.projectId as string

  try {
    if (editingVersion.value) {
      await projectStore.updateVersion(editingVersion.value.id, {
        version: versionForm.value.version,
        milestoneId: versionForm.value.milestoneId,
        description: versionForm.value.description,
      })
    } else {
      await projectStore.createVersion({
        projectId,
        version: versionForm.value.version,
        milestoneId: versionForm.value.milestoneId,
        description: versionForm.value.description,
      })
    }
    versionDialog.value = false
  } catch (error) {
    console.error('Failed to save version:', error)
  }
}

function deleteVersion(version: Version) {
  versionToDelete.value = version
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!versionToDelete.value) return

  try {
    await projectStore.deleteVersion(versionToDelete.value.id)
    deleteDialog.value = false
  } catch (error) {
    console.error('Failed to delete version:', error)
  }
}

onMounted(() => {
  const projectId = route.params.projectId as string
  if (projectId && projectStore.versions.length === 0) {
    projectStore.fetchVersions(projectId)
  }
})
</script>
