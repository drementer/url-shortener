import axios, { type AxiosResponse } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  get: async (path: string): Promise<AxiosResponse> => {
    return client.get(path);
  },

  post: async (path: string, body: unknown): Promise<AxiosResponse> => {
    return client.post(path, body);
  },

  delete: async (path: string): Promise<AxiosResponse> => {
    return client.delete(path);
  },
};
