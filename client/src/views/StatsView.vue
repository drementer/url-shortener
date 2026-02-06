<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { RouterLink } from 'vue-router';
import { Badge } from '@/components/ui/badge';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Link,
  ExternalLink,
  Copy,
  MousePointerClick,
  Users,
  Calendar,
  Clock,
  Link2Off,
  RotateCw,
} from 'lucide-vue-next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUrls } from '@/composables/useUrls';
import type { UrlStatsResponse } from '@/types/api';
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const { getUrlStats } = useUrls();
const route = useRoute();

const stats = ref<UrlStatsResponse | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const isNotFound = ref(false);

async function fetchStats(code: string) {
  if (!code) return;
  loading.value = true;
  error.value = null;
  isNotFound.value = false;
  try {
    stats.value = await getUrlStats(code);
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      isNotFound.value = true;
      error.value = e.response.data?.error ?? 'URL not found';
    } else {
      error.value = e instanceof Error ? e.message : 'Failed to load stats';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  const shortCode = route.params.shortCode as string;
  fetchStats(shortCode);
});

watch(
  () => route.params.shortCode,
  (shortCode) => {
    if (shortCode) fetchStats(shortCode as string);
  }
);

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortUrl = computed(() => {
  if (!stats.value) return '';
  return `${baseURL}/${stats.value.shortCode}`;
});

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard!');
};

/** Count of unique IPs across all click events */
const uniqueClicks = computed(() => {
  const events = stats.value?.clickEvents;
  if (!events?.length) return 0;
  const uniqueIPs = new Set(events.map((c) => c.ip).filter(Boolean));
  return uniqueIPs.size;
});

/** Find the most recent click event by createdAt, regardless of array order */
const lastClickedAt = computed(() => {
  const events = stats.value?.clickEvents;
  if (!events?.length) return 'N/A';
  const sorted = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return sorted[0] ? formatDate(sorted[0].createdAt) : 'N/A';
});
</script>

<template>
  <main class="min-h-dvh py-8">
    <div class="container max-w-4xl mx-auto px-4">
      <RouterLink
        to="/"
        class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        Back to Home
      </RouterLink>

      <p v-if="loading" class="text-muted-foreground">Loading stats...</p>

      <!-- Not found / expired / deleted state -->
      <div v-else-if="isNotFound" class="flex flex-col items-center py-16">
        <div class="relative mb-6 inline-flex items-center justify-center">
          <div class="rounded-full bg-destructive/10 p-6">
            <Link2Off class="size-12 text-destructive" :stroke-width="1.5" />
          </div>
        </div>
        <h2 class="mb-2 text-2xl font-bold tracking-tight text-foreground">
          URL Not Found
        </h2>
        <p class="mx-auto mb-2 max-w-md text-center text-muted-foreground">
          The shortened URL
          <code class="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground">
            {{ route.params.shortCode }}
          </code>
          could not be found.
        </p>
        <p class="mx-auto mb-8 max-w-md text-center text-sm text-muted-foreground/70">
          It may have expired or been deleted by its owner.
        </p>
        <div class="flex gap-3">
          <Button
            variant="outline"
            class="gap-2"
            @click="fetchStats(route.params.shortCode as string)"
          >
            <RotateCw class="size-4" />
            Retry
          </Button>
          <RouterLink to="/">
            <Button class="gap-2">
              <ArrowLeft class="size-4" />
              Back to Home
            </Button>
          </RouterLink>
        </div>
      </div>

      <!-- Generic error state -->
      <p v-else-if="error" class="text-destructive">{{ error }}</p>

      <!-- Stats content -->
      <div v-else-if="stats" class="space-y-6">
        <!-- Header -->
        <Card class="overflow-hidden">
          <div class="h-2 bg-linear-to-r from-primary via-primary/60 to-primary/20" />
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <CardTitle class="text-2xl font-bold flex items-center gap-2">
                <div class="p-2 rounded-lg bg-primary/10">
                  <Link class="w-5 h-5 text-primary" />
                </div>
                URL Statistics
              </CardTitle>
              <Badge variant="outline" class="text-xs">
                {{ stats.shortCode }}
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <p class="text-xs font-medium text-muted-foreground mb-1">
                Original URL
              </p>
              <a
                :href="stats.originalUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-foreground hover:text-primary transition-colors break-all inline-flex items-start gap-1"
              >
                {{ stats.originalUrl }}
                <ExternalLink class="w-3 h-3 mt-1 shrink-0" />
              </a>
            </div>
            <div
              class="flex items-center justify-between gap-4 rounded-lg border bg-muted/50 p-3"
            >
              <div class="min-w-0">
                <p class="text-xs font-medium text-muted-foreground mb-0.5">
                  Short URL
                </p>
                <p class="text-sm font-mono font-semibold text-primary truncate">
                  {{ shortUrl }}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                class="shrink-0"
                @click="copyToClipboard(shortUrl)"
              >
                <Copy class="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Total Clicks -->
          <Card>
            <CardContent class="p-6">
              <div class="flex items-center gap-4">
                <div class="p-3 rounded-full bg-primary/10">
                  <MousePointerClick class="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">Total Clicks</p>
                  <p class="text-3xl font-bold">{{ stats.clicks }}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Unique Clicks -->
          <Card>
            <CardContent class="p-6">
              <div class="flex items-center gap-4">
                <div class="p-3 rounded-full bg-primary/10">
                  <Users class="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">Unique Clicks</p>
                  <p class="text-3xl font-bold">{{ uniqueClicks }}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Created At -->
          <Card>
            <CardContent class="p-6">
              <div class="flex items-center gap-4">
                <div class="p-3 rounded-full bg-primary/10">
                  <Calendar class="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">Created</p>
                  <p class="text-lg font-medium">
                    {{ formatDate(stats.createdAt) }}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Last Clicked -->
          <Card>
            <CardContent class="p-6">
              <div class="flex items-center gap-4">
                <div class="p-3 rounded-full bg-primary/10">
                  <Clock class="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">Last Clicked</p>
                  <p class="text-lg font-medium">
                    {{ lastClickedAt }}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Click History Table (if available) -->
        <Card v-if="stats.clickEvents?.length">
          <CardHeader>
            <CardTitle>Recent Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User Agent</TableHead>
                  <TableHead>Referer</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="(click, index) in stats.clickEvents"
                  :key="click.id ?? index"
                >
                  <TableCell>{{ formatDate(click.createdAt) }}</TableCell>
                  <TableCell class="max-w-[200px] truncate">
                    {{ click.userAgent ?? '-' }}
                  </TableCell>
                  <TableCell class="max-w-[200px] truncate">
                    {{ click.referer ?? '-' }}
                  </TableCell>
                  <TableCell class="max-w-[200px] truncate">
                    {{ click.ip ?? '-' }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  </main>
</template>
