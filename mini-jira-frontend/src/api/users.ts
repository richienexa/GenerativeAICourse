import client from './client'
import type { User, UserRole, CreateUserPayload } from '@/types'

export async function fetchUsers(): Promise<User[]> {
  const { data } = await client.get<User[]>('/users')
  return data
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await client.post<User>('/users', payload)
  return data
}

export async function updateUserRole(userId: string, role: UserRole): Promise<User> {
  const { data } = await client.patch<User>(`/users/${userId}`, { role })
  return data
}

export async function updateUserProfile(
  userId: string,
  payload: { name?: string; password?: string },
): Promise<User> {
  const { data } = await client.patch<User>(`/users/${userId}`, payload)
  return data
}
