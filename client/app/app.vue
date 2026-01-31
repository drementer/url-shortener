<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
</script>

<template>
  <div class="min-h-dvh bg-background">
    <NuxtPage />
  </div>
  <Toaster :expand="true" richColors position="bottom-center" />
</template>
