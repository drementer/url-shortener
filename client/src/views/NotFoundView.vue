<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { RouterLink } from 'vue-router';
import { LinkIcon, ArrowLeftIcon } from 'lucide-vue-next';
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center px-4">
    <div class="text-center">
      <div class="relative mb-6 inline-flex items-center justify-center">
        <span class="text-[10rem] font-black leading-none tracking-tighter text-primary/10">
          404
        </span>
        <LinkIcon
          class="absolute size-16 text-primary drop-shadow-lg"
          :stroke-width="1.5"
        />
      </div>

      <h1 class="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Page not found
      </h1>
      <p class="mx-auto mb-8 max-w-md text-muted-foreground">
        The page you're looking for doesn't exist or may have been moved.
        Let's get you back on track.
      </p>

      <RouterLink to="/">
        <Button size="lg" class="gap-2">
          <ArrowLeftIcon class="size-4" />
          Back to Home
        </Button>
      </RouterLink>
    </div>
  </div>
</template>
