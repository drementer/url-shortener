<script setup lang="ts">
import { ref, onMounted } from 'vue';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

import { toast } from 'vue-sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';

import { useUrls } from '@/composables/useUrls';
import { urlStorage } from '@/lib/localStorage';

import { RouterLink } from 'vue-router';
import type { CreateUrlResponse } from '@/types/api';

const { createShortUrl } = useUrls();

const customCodeInput = ref('');
const redirectUrlInput = ref('');
const isSubmitting = ref(false);
const savedUrls = ref<CreateUrlResponse[]>([]);

const handleSubmit = async () => {
  if (isSubmitting.value) return;
  if (!redirectUrlInput.value.trim()) {
    toast.error('Please enter a URL to shorten');
    return;
  }

  isSubmitting.value = true;

  try {
    const result = await createShortUrl(redirectUrlInput.value, customCodeInput.value);

    // Save to localStorage
    urlStorage.saveUrl(result);
    savedUrls.value = urlStorage.getUrls();

    toast.success('URL shortened!', {
      description: `${baseURL}/${result.shortCode}`,
      action: {
        label: 'Copy',
        onClick: () => {
          navigator.clipboard.writeText(`${baseURL}/${result.shortCode}`);
          toast.success('Copied to clipboard!');
        },
      },
    });

    // Clear form inputs
    redirectUrlInput.value = '';
    customCodeInput.value = '';
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Please try again';
    toast.error('Failed to shorten URL', {
      description: message,
    });
  } finally {
    isSubmitting.value = false;
  }
};

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
  <main class="grid place-items-center min-h-dvh">
    <div class="container max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle class="text-3xl font-bold">Shorten URL</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            @submit.prevent="handleSubmit"
            class="flex flex-col space-y-5 w-full"
            :class="{ 'opacity-50': isSubmitting }"
            :disabled="isSubmitting"
          >
            <div class="w-full">
              <label for="custom-code" class="block text-sm font-medium mb-2">
                Custom URL
                <span class="text-xs text-muted-foreground"> (Optional) </span>
              </label>
              <InputGroup>
                <InputGroupInput
                  id="custom-code"
                  v-model="customCodeInput"
                  placeholder="magic-path"
                  class="pl-0!"
                />
                <InputGroupAddon>
                  <InputGroupText class="text-foreground">
                    https://link.kilincarslan.dev/
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </div>

            <div class="w-full">
              <label for="redirect-url" class="block text-sm font-medium mb-2">
                Redirect URL
              </label>
              <Input
                id="redirect-url"
                v-model="redirectUrlInput"
                type="url"
                placeholder="https://example.com/very-long-url"
                class="w-full"
                :disabled="isSubmitting"
                autofocus
              />
            </div>

            <Button
              type="submit"
              class="w-full cursor-pointer"
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting">Shortening...</span>
              <span v-else>Shorten URL</span>
            </Button>
          </form>
        </CardContent>
      </Card>

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
    </div>
  </main>
</template>
