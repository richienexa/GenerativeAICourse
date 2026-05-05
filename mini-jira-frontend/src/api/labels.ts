import client from './client'

export interface Label {
  id: string
  name: string
}

export async function fetchLabels(): Promise<Label[]> {
  const { data } = await client.get<Label[]>('/labels')
  return data
}
