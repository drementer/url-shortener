<script setup lang="ts">
import {
  ArrowLeft,
  Link,
  MousePointerClick,
  Users,
  Calendar,
  Clock,
} from 'lucide-vue-next';

const route = useRoute();
const shortCode = computed(() => route.params.shortCode as string);

const { getUrlStats } = useUrls();

const { data, error } = await useAsyncData(`stats-${shortCode.value}`, () => {
  return getUrlStats(shortCode.value);
});

const stats = computed(() => data.value);

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
</script>

<template>
  <main class="min-h-dvh py-8">
    <div class="container max-w-4xl mx-auto px-4">
      <!-- Back button -->
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        Back to Home
      </NuxtLink>

      <!-- Error state -->
      <div v-if="error" class="space-y-4">
        <Card>
          <CardContent class="p-8">
            <div class="text-center text-destructive">
              <p class="font-medium">Failed to load statistics</p>
              <p class="text-sm text-muted-foreground mt-1">
                URL not found or an error occurred
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Stats content -->
      <div v-if="stats" class="space-y-6">
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
              <Badge variant="secondary">
                {{ shortCode }}
              </Badge>
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
                    {{
                      formatDate(stats.clickEvents[stats.clicks - 1].createdAt)
                    }}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Click History Table (if available) -->
        <Card v-if="stats.clicks">
          <CardHeader>
            <CardTitle>Recent Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User Agent</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Referer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="(click, index) in stats.clickEvents"
                  :key="index"
                >
                  <TableCell>{{ formatDate(click.createdAt) }}</TableCell>
                  <TableCell class="max-w-[200px] truncate">
                    {{ click.userAgent || '-' }}
                  </TableCell>
                  <TableCell class="max-w-[200px] truncate">
                    {{ click.referer || '-' }}
                  </TableCell>
                  <TableCell class="max-w-[200px] truncate">
                    {{ click.ip || '-' }}
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
