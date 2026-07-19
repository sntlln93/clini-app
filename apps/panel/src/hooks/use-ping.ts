import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function usePing() {
  return useQuery({
    queryKey: ['ping'],
    queryFn: async () => {
      const { data } = await api.get<{ status: string }>('/api/ping')
      return data
    },
  })
}
