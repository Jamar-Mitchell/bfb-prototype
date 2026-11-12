import axios from 'axios'

import { env } from '../config/env'
import { useSessionStore } from '../../stores/session'
import { toApiError } from './errors'

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

apiClient.interceptors.request.use((config) => {
  const accessToken = useSessionStore.getState().accessToken

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useSessionStore.getState().clearSession()
    }

    // Every failed call rejects with an ApiError, so callers never handle raw Axios errors.
    return Promise.reject(toApiError(error))
  },
)

