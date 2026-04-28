import client from './client'
import type { User, UserRole } from '@/types'

export async function fetchUsers(): Promise<User[]> {
  const { data } = await client.get<User[]>('/users')
  return data
}

export async function updateUserRole(userId: string, role: UserRole): Promise<User> {
  const { data } = await client.patch<User>(`/users/${userId}`, { role })
  return data
}
