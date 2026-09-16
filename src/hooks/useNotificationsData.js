import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

/**
 * Helper to dispatch in-app notifications.
 * Can target a specific user or all admins within an organization.
 */
export async function sendNotification({
  recipientId,
  recipientRole,
  orgId,
  actorId,
  type,
  title,
  message,
  link = null,
  metadata = {},
}) {
  try {
    let targetRecipientIds = [];

    if (recipientId) {
      targetRecipientIds = [recipientId];
    } else if (recipientRole === "admin") {
      let query = supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (orgId) {
        query = query.eq("org_id", orgId);
      }

      const { data: admins, error: adminErr } = await query;
      if (adminErr) {
        console.warn("Notice querying admins for notification:", adminErr.message);
      } else if (admins?.length) {
        targetRecipientIds = admins.map((a) => a.id);
      }
    }

    if (targetRecipientIds.length === 0) {
      return null;
    }

    let effectiveActorId = actorId;
    if (!effectiveActorId) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        effectiveActorId = authData?.user?.id || null;
      } catch (_) {}
    }

    const rows = targetRecipientIds.map((rId) => ({
      recipient_id: rId,
      actor_id: effectiveActorId,
      org_id: orgId || null,
      type,
      title,
      message,
      link,
      metadata,
    }));

    const { error } = await supabase
      .from("notifications")
      .insert(rows);

    if (error) {
      console.warn("Notice inserting notification:", error.message || error);
      return null;
    }

    return true;
  } catch (err) {
    console.warn("Failed to dispatch notification:", err);
    return null;
  }
}

/**
 * Hook to manage in-app notifications with Supabase Realtime synchronization.
 */
export function useNotifications(userId) {
  const qc = useQueryClient();
  const queryKey = ["notifications", userId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        // Fallback gracefully if notifications table does not exist yet
        console.warn("Notice querying notifications table:", error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Supabase Realtime listener for live push updates
  useEffect(() => {
    if (!userId) return;

    const channelId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 8);
    const channelName = `notifs-${userId}-${channelId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const invalidate = () => qc.invalidateQueries({ queryKey });

  // Mark single notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId) => {
      if (!notificationId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("recipient_id", userId);
      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData(queryKey);
      if (prev) {
        qc.setQueryData(
          queryKey,
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      }
      return { prev };
    },
    onError: (err, variables, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKey, context.prev);
      }
    },
    onSettled: invalidate,
  });

  // Mark all unread notifications as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("recipient_id", userId)
        .eq("read", false);
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData(queryKey);
      if (prev) {
        qc.setQueryData(
          queryKey,
          prev.map((n) => ({ ...n, read: true }))
        );
      }
      return { prev };
    },
    onError: (err, variables, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKey, context.prev);
      }
    },
    onSettled: invalidate,
  });

  // Delete single notification
  const deleteNotification = useMutation({
    mutationFn: async (notificationId) => {
      if (!notificationId) return;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("recipient_id", userId);
      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData(queryKey);
      if (prev) {
        qc.setQueryData(
          queryKey,
          prev.filter((n) => n.id !== notificationId)
        );
      }
      return { prev };
    },
    onError: (err, variables, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKey, context.prev);
      }
    },
    onSettled: invalidate,
  });

  // Clear all notifications
  const clearAll = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("recipient_id", userId);
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey });
      qc.setQueryData(queryKey, []);
    },
    onSettled: invalidate,
  });

  const notifications = query.data || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    markAsRead: (id) => markAsRead.mutateAsync(id),
    markAllAsRead: () => markAllAsRead.mutateAsync(),
    deleteNotification: (id) => deleteNotification.mutateAsync(id),
    clearAll: () => clearAll.mutateAsync(),
    refetch: invalidate,
  };
}
