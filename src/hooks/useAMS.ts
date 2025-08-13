import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type AmsDataset = "sp-traffic" | "sp-conversion";
export type AmsDestinationType = "firehose" | "sqs" | "kinesis";

export interface AmsSubscription {
  id: string;
  connection_id: string;
  dataset_id: AmsDataset;
  destination_type: AmsDestinationType | null;
  destination_arn: string | null;
  region: string | null;
  status: string | null;
  subscription_id: string | null;
  last_delivery_at: string | null;
  updated_at: string;
  created_at: string;
}

export const useAMS = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  console.log('useAMS initialized, loading:', loading);

  const list = useCallback(async (connectionId: string) => {
    const { data, error } = await supabase
      .from("ams_subscriptions")
      .select("*")
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load AMS subscriptions", description: error.message, variant: "destructive" });
      return [] as AmsSubscription[];
    }
    return (data || []) as AmsSubscription[];
  }, [toast]);

  const subscribe = useCallback(async (params: {
    connectionId: string;
    datasetId: AmsDataset;
    destinationType: AmsDestinationType;
    destinationArn: string;
    region: string;
  }) => {
    console.log('useAMS.subscribe called with:', params);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ams-subscribe", {
        body: { action: "subscribe", ...params },
      });
      if (error) throw error as any;
      toast({ title: "Subscribed", description: `${params.datasetId} enabled` });
      return data;
    } catch (e: any) {
      toast({ title: "Subscription failed", description: e.message || "Unknown error", variant: "destructive" });
      throw e;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const archive = useCallback(async (params: { connectionId: string; subscriptionId: string }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ams-subscribe", {
        body: { action: "archive", ...params },
      });
      if (error) throw error as any;
      toast({ title: "Archived", description: `Subscription archived` });
      return data;
    } catch (e: any) {
      toast({ title: "Archive failed", description: e.message || "Unknown error", variant: "destructive" });
      throw e;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const processStreamData = useCallback(async (connectionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ams-aggregate", {
        body: { connectionId },
      });
      if (error) throw error as any;
      toast({ title: "Processed stream data", description: "Updated 7d/14d metrics." });
      return data;
    } catch (e: any) {
      toast({ title: "Processing failed", description: e.message || "Unknown error", variant: "destructive" });
      throw e;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { loading, list, subscribe, archive, processStreamData };
};
