import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

interface SyncJob {
  id: string
  connection_id: string
  user_id: string
  status: string
  phase: string | null
  progress_percent: number
  started_at: string
  finished_at: string | null
  error_details: any
  sync_details: any
  created_at: string
}

export function useSyncProgress(connectionId?: string) {
  const { user } = useAuth()
  const [currentSync, setCurrentSync] = useState<SyncJob | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || !connectionId) return

    // Fetch current running sync
    const fetchCurrentSync = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('sync_jobs')
          .select('*')
          .eq('connection_id', connectionId)
          .eq('status', 'running')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error('Error fetching sync progress:', error)
          return
        }

        setCurrentSync(data)
      } catch (error) {
        console.error('Error fetching sync progress:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentSync()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('sync_jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_jobs',
          filter: `connection_id=eq.${connectionId}`
        },
        (payload) => {
          const updatedJob = payload.new as any
          if (updatedJob && updatedJob.status === 'running') {
            setCurrentSync(updatedJob)
          } else if (updatedJob && ['success', 'error'].includes(updatedJob.status)) {
            setCurrentSync(null) // Clear when sync is complete
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, connectionId])

  return {
    currentSync,
    loading,
    isRunning: currentSync?.status === 'running',
    progress: currentSync?.progress_percent || 0,
    phase: currentSync?.phase,
    error: currentSync?.status === 'error' ? currentSync.error_details : null
  }
}