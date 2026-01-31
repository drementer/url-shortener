import type { ApiError } from '~/types/api';

/**
 * Base API composable for centralized fetch configuration
 * Uses Nuxt's built-in $fetch with runtime config
 */
export const useApi = () => {
  const config = useRuntimeConfig();

  const api = $fetch.create({
    baseURL: config.public.apiBase as string,

    onRequest({ options }) {
      // Add default headers
      options.headers = {
        ...options.headers,
      };

      // Future: Add auth token here if needed
      // const token = useCookie('auth_token')
      // if (token.value) {
      //   options.headers.Authorization = `Bearer ${token.value}`
      // }
    },

    onResponseError({ response }) {
      const error = response._data as ApiError;
      console.error(
        `[API Error] ${response.status}:`,
        error?.message || 'Unknown error'
      );

      // Future: Handle specific error codes
      // if (response.status === 401) {
      //   navigateTo('/login')
      // }
    },
  });

  return { api };
};
