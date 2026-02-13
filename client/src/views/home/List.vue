<script setup lang="ts">
import { ref, onMounted } from 'vue';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { urlStorage } from '@/lib/localStorage';

import { RouterLink } from 'vue-router';
import type { CreateUrlResponse } from '@/types/api';

const savedUrls = ref<CreateUrlResponse[]>([]);

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard!');
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const truncateUrl = (url: string, maxLength: number = 50) => {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
};

onMounted(() => {
  savedUrls.value = urlStorage.getUrls();
});
</script>

<template>
  <Card v-if="savedUrls.length > 0" class="mt-6">
    <CardHeader>
      <CardTitle class="text-2xl font-bold">Your Shortened URLs</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <div
          v-for="url in savedUrls"
          :key="url.id"
          class="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              <a
                :href="`${baseURL}/${url.shortCode}`"
                target="_blank"
                rel="noopener noreferrer"
                class="font-mono text-sm font-semibold text-primary hover:underline"
              >
                {{ baseURL }}/{{ url.shortCode }}
              </a>
            </div>
            <p class="text-sm text-muted-foreground truncate">
              {{ truncateUrl(url.originalUrl) }}
            </p>
            <p class="text-xs text-muted-foreground mt-1">
              Created: {{ formatDate(url.createdAt) }}
            </p>
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="copyToClipboard(`${baseURL}/${url.shortCode}`)"
              class="shrink-0"
            >
              Copy
            </Button>
            <RouterLink :to="`/stats/${url.shortCode}`">
              <Button variant="outline" size="sm" class="shrink-0">
                Stats
              </Button>
            </RouterLink>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
