import client from './client'
import type { User } from '@/types'

export async function getMe(): Promise<User> {
  const { data } = await client.get<User>('/auth/me')
  return data
}

export async function login(email: string, password: string): Promise<{ user: User; accessToken: string }> {
  const { data } = await client.post<{ user: User; accessToken: string }>('/auth/login', { email, password })
  return data
}

export async function refreshToken(): Promise<string> {
  const { data } = await client.post<{ accessToken: string }>('/auth/refresh')
  return data.accessToken
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout')
}
