<script setup lang="ts">
import { ref } from 'vue';

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

const { createShortUrl } = useUrls();

const customCodeInput = ref('');
const redirectUrlInput = ref('');
const isSubmitting = ref(false);

const handleSubmit = async () => {
  if (isSubmitting.value) return;
  if (!redirectUrlInput.value.trim()) {
    toast.error('Please enter a URL to shorten');
    return;
  }

  isSubmitting.value = true;

  try {
    const result = await createShortUrl({
      url: redirectUrlInput.value,
      customCode: customCodeInput.value || undefined,
    });

    toast.success('URL shortened!', {
      description: result.shortCode,
      action: {
        label: 'Copy',
        onClick: () => {
          navigator.clipboard.writeText(result.shortCode);
          toast.success('Copied to clipboard!');
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Please try again';
    toast.error('Failed to shorten URL', {
      description: message,
    });
  } finally {
    isSubmitting.value = false;
  }
};
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
          >
            <div class="w-full">
              <label for="custom-code" class="block text-sm font-medium mb-2">
                Custom URL
                <span class="text-xs text-muted-foreground"> (optional) </span>
              </label>
              <InputGroup>
                <InputGroupInput
                  id="custom-code"
                  v-model="customCodeInput"
                  placeholder="magic-path"
                  class="pl-0!"
                  :disabled="isSubmitting"
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
    </div>
  </main>
</template>
