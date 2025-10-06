import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const useCleanupStuckSyncs = () => {
  const cleanupStuckSyncs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-stuck-syncs', {
        method: 'POST'
      })

      if (error) {
        console.error('Error cleaning up stuck syncs:', error)
        toast.error('Failed to cleanup stuck syncs')
        return false
      }

      if (data.cleaned > 0) {
        toast.success(`Cleaned up ${data.cleaned} stuck sync job(s)`)
      } else {
        toast.info('No stuck sync jobs found')
      }

      return true
    } catch (error) {
      console.error('Error calling cleanup function:', error)
      toast.error('Failed to cleanup stuck syncs')
      return false
    }
  }

  return { cleanupStuckSyncs }
}
