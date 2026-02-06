<script setup lang="ts">
import 'vue-sonner/style.css';

import { Toaster } from 'vue-sonner';
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="min-h-dvh bg-background">
    <RouterView />
  </div>
  <Toaster :expand="true" richColors position="bottom-center" />
</template>
