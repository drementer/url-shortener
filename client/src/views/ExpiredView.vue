<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { RouterLink } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TimerOff, ArrowLeftIcon, PlusCircle } from 'lucide-vue-next';

const route = useRoute();
const shortCode = computed(() => route.params.shortCode as string);
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const expiredUrl = computed(() => `${baseURL}/${shortCode.value}`);
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center px-4">
    <div class="text-center max-w-lg">
      <div class="relative mb-6 inline-flex items-center justify-center">
        <div class="rounded-full bg-orange-500/10 p-6">
          <TimerOff class="size-12 text-orange-500" :stroke-width="1.5" />
        </div>
      </div>

      <h1 class="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Link Expired
      </h1>
      <p class="mb-6 text-muted-foreground">
        The shortened URL you're trying to visit has expired and is no longer active.
      </p>

      <Card class="mb-8 border-dashed">
        <CardContent class="p-4">
          <p class="text-xs font-medium text-muted-foreground mb-1">Expired URL</p>
          <p class="font-mono text-sm text-foreground/70 break-all">
            {{ expiredUrl }}
          </p>
        </CardContent>
      </Card>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <RouterLink to="/">
          <Button variant="outline" size="lg" class="gap-2">
            <ArrowLeftIcon class="size-4" />
            Back to Home
          </Button>
        </RouterLink>
        <RouterLink to="/">
          <Button size="lg" class="gap-2">
            <PlusCircle class="size-4" />
            Shorten a New URL
          </Button>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
