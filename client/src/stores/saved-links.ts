import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { CreateUrlResponse } from '@/types/api';
import { urlStorage } from '@/lib/localStorage';

export const useSavedLinksStore = defineStore('saved-links', () => {
  const savedLinks = ref<CreateUrlResponse[]>([]);

  const addLink = (link: CreateUrlResponse) => {
    savedLinks.value.unshift(link);
    urlStorage.saveUrl(link);
  };

  const loadFromStorage = () => {
    savedLinks.value = urlStorage.getUrls();
  };

  return { savedLinks, addLink, loadFromStorage };
});
