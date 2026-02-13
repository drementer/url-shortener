import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { CreateUrlResponse } from '@/types/api';

export const useSavedLinksStore = defineStore('saved-links', () => {
  const savedLinks = ref<CreateUrlResponse[]>([]);

  const addLink = (link: CreateUrlResponse) => {
    savedLinks.value.unshift(link);
  };

  return { savedLinks, addLink };
});
