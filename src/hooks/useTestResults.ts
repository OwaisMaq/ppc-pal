import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TestResult {
  id: string;
  user_id: string;
  category: string;
  test_name: string;
  status: string;
  details: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SaveResultInput {
  test_name: string;
  status: string;
  details?: Record<string, unknown>;
  notes?: string;
}

export function useTestResults(category: string) {
  const { user } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    if (!user) {
      setResults([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('category', category)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching test results:', error);
        setResults([]);
      } else {
        setResults((data as TestResult[]) || []);
      }
    } catch (err) {
      console.error('Error fetching test results:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user, category]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const saveResult = useCallback(async (input: SaveResultInput) => {
    if (!user) return;

    try {
      // Check if result already exists
      const existing = results.find(r => r.test_name === input.test_name);

      if (existing) {
        // Update existing result
        const { error } = await supabase
          .from('test_results')
          .update({
            status: input.status,
            details: (input.details || null) as unknown as null,
            notes: input.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating test result:', error);
          return;
        }
      } else {
        // Insert new result
        const { error } = await supabase
          .from('test_results')
          .insert([{
            user_id: user.id,
            category,
            test_name: input.test_name,
            status: input.status,
            details: (input.details || null) as unknown as null,
            notes: input.notes || null,
          }]);

        if (error) {
          console.error('Error inserting test result:', error);
          return;
        }
      }

      // Refresh results
      await fetchResults();
    } catch (err) {
      console.error('Error saving test result:', err);
    }
  }, [user, category, results, fetchResults]);

  return { results, loading, saveResult, refetch: fetchResults };
}
