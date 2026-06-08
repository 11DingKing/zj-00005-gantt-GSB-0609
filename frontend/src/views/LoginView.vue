<template>
  <v-container class="fill-height">
    <v-row class="fill-height align-center justify-center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Gantt Project Management</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form v-model="valid" ref="form">
              <v-text-field
                v-model="username"
                label="Username or Email"
                :rules="requiredRules"
                prepend-icon="mdi-account"
                required
              ></v-text-field>
              <v-text-field
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Password"
                :rules="requiredRules"
                prepend-icon="mdi-lock"
                :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append="showPassword = !showPassword"
                required
              ></v-text-field>
              <v-alert v-if="error" type="error" class="mb-4">
                {{ error }}
              </v-alert>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" :loading="loading" @click="login" :disabled="!valid">
              Login
            </v-btn>
            <v-btn text :to="{ name: 'Register' }">Register</v-btn>
          </v-card-actions>
        </v-card>
        <v-card class="mt-4">
          <v-card-text>
            <div class="text-caption text-secondary">
              Demo accounts:
              <br />pm / pm123456
              <br />dev1 / dev123456
              <br />dev2 / dev123456
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const valid = ref(false)
const showPassword = ref(false)
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const requiredRules = [(v: any) => !!v || 'This field is required']

async function login() {
  if (!valid.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    await authStore.login({
      username: username.value,
      password: password.value,
    })
    router.push({ name: 'Dashboard' })
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>
