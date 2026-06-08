<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <h2 class="text-h5 ma-0">Team</h2>
        <v-btn color="primary" prepend-icon="mdi-account-plus" @click="openInviteDialog">
          Invite Member
        </v-btn>
      </v-col>
    </v-row>

    <v-card class="mb-6">
      <v-card-title>
        Members ({{ projectStore.currentProject?.members?.length || 0 }})
      </v-card-title>
      <v-divider></v-divider>
      <v-list density="compact">
        <v-list-item
          v-for="member in projectStore.currentProject?.members"
          :key="member.id"
        >
          <template v-slot:prepend>
            <v-avatar size="40">
              <span>{{ (member.user.name || member.user.username).charAt(0).toUpperCase() }}</span>
            </v-avatar>
          </template>
          <v-list-item-title>
            {{ member.user.name || member.user.username }}
            <v-chip
              v-if="member.role === Role.OWNER"
              size="small"
              color="error"
              class="ml-2"
            >
              Owner
            </v-chip>
          </v-list-item-title>
          <v-list-item-subtitle>
            {{ member.user.email }}
          </v-list-item-subtitle>
          <template v-slot:append>
            <v-select
              v-model="member.role"
              :items="roleOptions"
              density="compact"
              hide-details
              variant="outlined"
              :disabled="!canChangeRole(member)"
              @update:model-value="updateRole(member.id, member.role)"
              class="mr-3"
              style="min-width: 120px"
            ></v-select>
            <v-btn
              v-if="member.role !== Role.OWNER && canRemoveMember"
              icon
              color="error"
              @click="removeMember(member)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-list-item>

        <v-list-item
          v-if="!projectStore.currentProject?.members?.length"
          disabled
        >
          <v-list-item-title>No members yet</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>

    <v-card v-if="projectStore.invitations.length > 0">
      <v-card-title>
        Pending Invitations ({{ projectStore.invitations.length }})
      </v-card-title>
      <v-divider></v-divider>
      <v-list density="compact">
        <v-list-item
          v-for="invitation in projectStore.invitations"
          :key="invitation.id"
        >
          <template v-slot:prepend>
            <v-avatar size="40" color="grey">
              <v-icon>mdi-email</v-icon>
            </v-avatar>
          </template>
          <v-list-item-title>{{ invitation.email }}</v-list-item-title>
          <v-list-item-subtitle>
            Invited as {{ invitation.role }} - Expires {{ formatDate(invitation.expiresAt) }}
          </v-list-item-subtitle>
          <template v-slot:append>
            <v-btn
              v-if="canCancelInvite"
              icon
              color="error"
              @click="cancelInvitation(invitation.id)"
            >
              <v-icon>mdi-cancel</v-icon>
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-dialog v-model="inviteDialog" max-width="500px">
      <v-card>
        <v-card-title>
          Invite Team Member
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="inviteDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-form v-model="formValid">
            <v-text-field
              v-model="inviteForm.email"
              label="Email Address"
              type="email"
              :rules="[requiredRule, emailRule]"
              required
            ></v-text-field>

            <v-select
              v-model="inviteForm.role"
              label="Role"
              :items="inviteRoleOptions"
              :rules="[requiredRule]"
              required
            ></v-select>

            <v-alert
              border="start"
              color="info"
              variant="tonal"
              class="mt-4"
            >
              <template v-slot:prepend>
                <v-icon>mdi-information</v-icon>
              </template>
              <strong>Role Permissions:</strong><br/>
              <ul class="mt-2 mb-0">
                <li><strong>Admin:</strong> Manage team, settings, and all content</li>
                <li><strong>Member:</strong> Create and edit tasks, milestones</li>
                <li><strong>Viewer:</strong> Read-only access</li>
              </ul>
            </v-alert>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="inviteDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="sendInvitation" :disabled="!formValid">
            Send Invitation
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="removeDialog" max-width="400px">
      <v-card>
        <v-card-title>Remove Member</v-card-title>
        <v-card-text>
          Are you sure you want to remove {{ memberToRemove?.user.name || memberToRemove?.user.username }} from the project?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="removeDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmRemove">Remove</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useAuthStore } from '@/stores/auth'
import { Role } from '@/types'
import type { ProjectMember, Invitation } from '@/types'

const route = useRoute()
const projectStore = useProjectStore()
const authStore = useAuthStore()

const inviteDialog = ref(false)
const formValid = ref(false)
const removeDialog = ref(false)
const memberToRemove = ref<ProjectMember | null>(null)

const inviteForm = ref({
  email: '',
  role: Role.MEMBER,
})

const requiredRule = [(v: string) => !!v || 'Required']
const emailRule = [
  (v: string) => /^\S+@\S+\.\S+$/.test(v) || 'Invalid email address',
]

const roleOptions = [
  { title: 'Owner', value: Role.OWNER },
  { title: 'Admin', value: Role.ADMIN },
  { title: 'Member', value: Role.MEMBER },
  { title: 'Viewer', value: Role.VIEWER },
]

const inviteRoleOptions = [
  { title: 'Admin', value: Role.ADMIN },
  { title: 'Member', value: Role.MEMBER },
  { title: 'Viewer', value: Role.VIEWER },
]

const currentUserRole = computed(() => {
  const userId = authStore.user?.id
  if (!userId || !projectStore.currentProject?.members) return Role.VIEWER
  
  const member = projectStore.currentProject.members.find((m) => m.userId === userId)
  return member?.role || Role.VIEWER
})

const canChangeRole = (member: ProjectMember): boolean => {
  if (member.role === Role.OWNER) return false
  return currentUserRole.value === Role.OWNER || currentUserRole.value === Role.ADMIN
}

const canRemoveMember = computed(() => {
  return currentUserRole.value === Role.OWNER || currentUserRole.value === Role.ADMIN
})

const canCancelInvite = computed(() => {
  return currentUserRole.value === Role.OWNER || currentUserRole.value === Role.ADMIN
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function openInviteDialog() {
  inviteForm.value = {
    email: '',
    role: Role.MEMBER,
  }
  inviteDialog.value = true
}

async function sendInvitation() {
  const projectId = route.params.projectId as string
  try {
    await projectStore.createInvitation(projectId, inviteForm.value.email, inviteForm.value.role)
    inviteDialog.value = false
  } catch (error) {
    console.error('Failed to send invitation:', error)
  }
}

async function updateRole(memberId: string, role: Role) {
  const projectId = route.params.projectId as string
  try {
    await projectStore.updateMemberRole(projectId, memberId, role)
  } catch (error) {
    console.error('Failed to update role:', error)
  }
}

function removeMember(member: ProjectMember) {
  memberToRemove.value = member
  removeDialog.value = true
}

async function confirmRemove() {
  if (!memberToRemove.value) return
  const projectId = route.params.projectId as string
  try {
    await projectStore.removeMember(projectId, memberToRemove.value.id)
    removeDialog.value = false
  } catch (error) {
    console.error('Failed to remove member:', error)
  }
}

async function cancelInvitation(id: string) {
  try {
    await projectStore.cancelInvitation(id)
  } catch (error) {
    console.error('Failed to cancel invitation:', error)
  }
}

onMounted(async () => {
  const projectId = route.params.projectId as string
  if (projectId) {
    if (!projectStore.currentProject?.members) {
      await projectStore.fetchProject(projectId)
    }
    await projectStore.fetchInvitations(projectId)
  }
})
</script>
