import { createRouter, createWebHistory } from 'vue-router';
import HomeLayout from '@/views/home/Layout.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeLayout,
    },
    {
      path: '/stats/:shortCode',
      name: 'stats',
      component: () => import('@/views/StatsView.vue'),
    },
    {
      path: '/expired/:shortCode',
      name: 'expired',
      component: () => import('@/views/ExpiredView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
});

export default router;
