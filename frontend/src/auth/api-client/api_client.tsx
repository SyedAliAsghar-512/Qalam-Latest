import { create } from 'apisauce';
import { HTTP_Headers } from '../../shared/config/enum';
import UserStorage from '../user/UserStorage';
import { resetToLogin } from '../../navigation/main/RootNavigation';

const apiClient = create({
  baseURL: 'http://10.90.19.219:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

export const setSecretKey = () => {
  apiClient.setHeader('api-key', HTTP_Headers['key']);
};

export const setAuthHeaders = async (token: string) => {
  apiClient.setHeader('Authorization', `Bearer ${token}`);
};

export const clearAuthHeaders = () => {
  apiClient.deleteHeader('Authorization');
};

// Auth endpoints that should not get Authorization header
const isAuthEndpoint = (url: string) =>
  url.includes('/qalam/login')

// REQUEST INTERCEPTOR
apiClient.axiosInstance.interceptors.request.use(async config => {
  const token = await UserStorage.getAccessToken();
  const url = config.url || '';

  // Skip Authorization for auth endpoints
  if (isAuthEndpoint(url)) return config;

  if (token) {
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

// RESPONSE INTERCEPTOR (NO REFRESH LOGIC)
apiClient.axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Let auth endpoint errors pass through (e.g., invalid login)
    if (isAuthEndpoint(url)) {
      return Promise.reject(error);
    }

    // If unauthorized, logout directly (no refresh call)
    if (status === 401) {
      await UserStorage.clearTokens();
      await UserStorage.deleteUser();
      clearAuthHeaders();
      resetToLogin();
    }

    return Promise.reject(error);
  },
);

export default apiClient;