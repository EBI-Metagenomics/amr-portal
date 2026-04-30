import axios, { AxiosError, type AxiosInstance } from 'axios';
import { API_BASE_URL } from '@utils/common/constants';

export class ApiClient {
  private static instance: AxiosInstance | null = null;

  static getInstance(): AxiosInstance {
    if (!ApiClient.instance) {
      ApiClient.instance = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      ApiClient.instance.interceptors.response.use(
        response => response,
        (error: AxiosError) => Promise.reject(error)
      );
    }

    return ApiClient.instance;
  }
}

export default ApiClient.getInstance();
