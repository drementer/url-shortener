<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { RouterLink } from 'vue-router';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Link,
  MousePointerClick,
  Users,
  Calendar,
  Clock,
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

const { getUrlStats } = useUrls();
const route = useRoute();

const stats = ref<UrlStatsResponse | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

async function fetchStats(code: string) {
  if (!code) return;
  loading.value = true;
  error.value = null;
  try {
    stats.value = await getUrlStats(code);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load stats';
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

const lastClickedAt = (s: UrlStatsResponse | null) => {
  const last = s?.clickEvents?.[s.clickEvents.length - 1];
  return last ? formatDate(last.createdAt) : 'N/A';
};
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
      <p v-else-if="error" class="text-destructive">{{ error }}</p>

      <!-- Stats content -->
      <div v-else-if="stats" class="space-y-6">
        <!-- Header -->
        <Card>
          <CardHeader>
            <CardTitle class="text-2xl font-bold flex items-center gap-2">
              <Link class="w-6 h-6" />
              URL Statistics
            </CardTitle>
            <CardDescription class="break-all">
              {{ stats.originalUrl }}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary"> {{ stats.shortCode }} </Badge>
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
                  <p class="text-3xl font-bold">{{ stats.clicks }}</p>
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
                    {{ lastClickedAt(stats) }}
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
