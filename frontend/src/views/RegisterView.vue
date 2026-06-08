<template>
  <v-container class="fill-height">
    <v-row class="fill-height align-center justify-center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Register</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form v-model="valid" ref="form">
              <v-text-field
                v-model="username"
                label="Username"
                :rules="requiredRules"
                prepend-icon="mdi-account"
                required
              ></v-text-field>
              <v-text-field
                v-model="email"
                label="Email"
                :rules="emailRules"
                prepend-icon="mdi-email"
                required
              ></v-text-field>
              <v-text-field
                v-model="name"
                label="Name (Optional)"
                prepend-icon="mdi-account-circle"
              ></v-text-field>
              <v-text-field
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Password"
                :rules="passwordRules"
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
            <v-btn color="primary" :loading="loading" @click="register" :disabled="!valid">
              Register
            </v-btn>
            <v-btn text :to="{ name: 'Login' }">Login</v-btn>
          </v-card-actions>
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
const email = ref('')
const name = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const requiredRules = [(v: any) => !!v || 'This field is required']
const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid',
]
const passwordRules = [
  (v: string) => !!v || 'Password is required',
  (v: string) => v.length >= 6 || 'Password must be at least 6 characters',
]

async function register() {
  if (!valid.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    await authStore.register({
      username: username.value,
      email: email.value,
      name: name.value || undefined,
      password: password.value,
    })
    router.push({ name: 'Dashboard' })
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>
