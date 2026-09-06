<script setup lang="ts">
import 'vue-sonner/style.css';

import { Toaster } from 'vue-sonner';
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="min-h-dvh flex flex-col justify-between bg-background">
    <RouterView />
    <footer class="py-4 text-center text-xs text-muted-foreground">
      <a
        href="https://github.com/drementer/url-shortener"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:underline"
      >
        Based on url-shortener - https://github.com/drementer/url-shortener
      </a>
    </footer>
    <Toaster :expand="true" richColors position="bottom-center" />
  </div>
</template>
