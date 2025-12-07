
const API_URL = 'http://localhost:8080/api/v1';

export const getAuthToken = () => localStorage.getItem('nexus_jwt');
export const setAuthToken = (token: string) => localStorage.setItem('nexus_jwt', token);
export const removeAuthToken = () => localStorage.removeItem('nexus_jwt');

interface RequestOptions extends RequestInit {
  data?: any;
}

export const api = async <T>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.data) {
    config.body = JSON.stringify(options.data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `API Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};
