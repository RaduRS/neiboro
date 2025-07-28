'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Post, PostResponse, ChatMessage } from '@/lib/types';

interface UseRealtimeProps {
  clusterId?: string;
  chatSessionId?: string;
}

export function useRealtime({ clusterId, chatSessionId }: UseRealtimeProps = {}) {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  // Clean up channels on unmount
  useEffect(() => {
    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, []);

  // Subscribe to post changes in a cluster
  const subscribeToClusterPosts = (
    onPostCreated?: (post: Post) => void,
    onPostUpdated?: (post: Post) => void,
    onPostDeleted?: (postId: string) => void
  ) => {
    if (!clusterId) return;

    const channel = supabase
      .channel(`cluster_posts_${clusterId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `cluster_id=eq.${clusterId}`,
        },
        (payload) => {
          if (onPostCreated) {
            onPostCreated(payload.new as Post);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `cluster_id=eq.${clusterId}`,
        },
        (payload) => {
          if (onPostUpdated) {
            onPostUpdated(payload.new as Post);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts',
          filter: `cluster_id=eq.${clusterId}`,
        },
        (payload) => {
          if (onPostDeleted) {
            onPostDeleted(payload.old.id);
          }
        }
      )
      .subscribe();

    channelsRef.current.push(channel);
    return channel;
  };

  // Subscribe to post response changes
  const subscribeToPostResponses = (
    postId: string,
    onResponseCreated?: (response: PostResponse) => void
  ) => {
    const channel = supabase
      .channel(`post_responses_${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_responses',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          if (onResponseCreated) {
            onResponseCreated(payload.new as PostResponse);
          }
        }
      )
      .subscribe();

    channelsRef.current.push(channel);
    return channel;
  };

  // Subscribe to chat messages
  const subscribeToChatMessages = (
    onNewMessage?: (message: ChatMessage) => void
  ) => {
    if (!chatSessionId) return;

    const channel = supabase
      .channel(`chat_messages_${chatSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${chatSessionId}`,
        },
        (payload) => {
          if (onNewMessage) {
            onNewMessage(payload.new as ChatMessage);
          }
        }
      )
      .subscribe();

    channelsRef.current.push(channel);
    return channel;
  };

  // Subscribe to all post responses in a cluster (for real-time help offers)
  const subscribeToClusterPostResponses = (
    onResponseCreated?: (response: PostResponse) => void
  ) => {
    if (!clusterId) return;

    const channel = supabase
      .channel(`cluster_responses_${clusterId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_responses',
          // Use a more efficient filter by joining with posts table in the subscription
          filter: `post_id=in.(select id from posts where cluster_id=eq.${clusterId})`,
        },
        (payload) => {
          if (onResponseCreated) {
            onResponseCreated(payload.new as PostResponse);
          }
        }
      )
      .subscribe();

    channelsRef.current.push(channel);
    return channel;
  };

  // Unsubscribe from a specific channel
  const unsubscribe = (channel: RealtimeChannel) => {
    supabase.removeChannel(channel);
    channelsRef.current = channelsRef.current.filter(c => c !== channel);
  };

  // Unsubscribe from all channels
  const unsubscribeAll = () => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  };

  return {
    subscribeToClusterPosts,
    subscribeToPostResponses,
    subscribeToChatMessages,
    subscribeToClusterPostResponses,
    unsubscribe,
    unsubscribeAll,
  };
}