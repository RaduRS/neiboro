import { supabase } from './supabase';
import type { ChatSession, ChatMessage, CreateChatSessionData } from './types';

export class ChatService {
  // Get all chat sessions for a user (either as post owner or helper)
  static async getUserSessions(userId: string): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        post_response:post_responses(
          *,
          post:posts(
            *,
            user:users(id, first_name, profile_image_url)
          ),
          user:users(id, first_name, profile_image_url)
        )
      `)
      .or(`post_owner_id.eq.${userId},helper_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }

    return data || [];
  }

  // Get a specific chat session by ID
  static async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        post_response:post_responses(
          *,
          post:posts(
            *,
            user:users(id, first_name, profile_image_url)
          ),
          user:users(id, first_name, profile_image_url)
        )
      `)
      .eq('id', sessionId)
      .or(`post_owner_id.eq.${userId},helper_id.eq.${userId}`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Session not found or user doesn't have access
      }
      throw new Error(`Failed to get session: ${error.message}`);
    }

    return data;
  }

  // Create a new chat session (only by post owner from an accepted response)
  static async createSession(postOwnerId: string, sessionData: CreateChatSessionData): Promise<ChatSession> {
    // First verify that the post response exists and the user is the post owner
    const { data: postResponse, error: responseError } = await supabase
      .from('post_responses')
      .select(`
        *,
        post:posts!inner(user_id)
      `)
      .eq('id', sessionData.post_response_id)
      .eq('post.user_id', postOwnerId)
      .single();

    if (responseError || !postResponse) {
      throw new Error('Post response not found or you are not the post owner');
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        post_response_id: sessionData.post_response_id,
        post_owner_id: postOwnerId,
        helper_id: postResponse.user_id,
        status: 'active'
      })
      .select(`
        *,
        post_response:post_responses(
          *,
          post:posts(
            *,
            user:users(id, first_name, profile_image_url)
          ),
          user:users(id, first_name, profile_image_url)
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return data;
  }

  // Update session status
  static async updateSessionStatus(sessionId: string, userId: string, status: 'active' | 'completed' | 'cancelled'): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ status })
      .eq('id', sessionId)
      .or(`post_owner_id.eq.${userId},helper_id.eq.${userId}`)
      .select(`
        *,
        post_response:post_responses(
          *,
          post:posts(
            *,
            user:users(id, first_name, profile_image_url)
          ),
          user:users(id, first_name, profile_image_url)
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update session status: ${error.message}`);
    }

    return data;
  }

  // Get messages for a chat session
  static async getMessages(sessionId: string, userId: string, limit?: number): Promise<ChatMessage[]> {
    // First verify user has access to this session
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      throw new Error('Session not found or access denied');
    }

    let query = supabase
      .from('chat_messages')
      .select(`
        *,
        sender:users(id, first_name, profile_image_url)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    return data || [];
  }

  // Send a message in a chat session
  static async sendMessage(sessionId: string, senderId: string, message: string): Promise<ChatMessage> {
    // First verify user has access to this session
    const session = await this.getSession(sessionId, senderId);
    if (!session) {
      throw new Error('Session not found or access denied');
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        sender_id: senderId,
        message
      })
      .select(`
        *,
        sender:users(id, first_name, profile_image_url)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }

    // Update session's updated_at timestamp
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    return data;
  }

  // Mark messages as read
  static async markMessagesAsRead(sessionId: string, userId: string): Promise<void> {
    // First verify user has access to this session
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      throw new Error('Session not found or access denied');
    }

    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('session_id', sessionId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }
  }

  // Get unread message count for a user
  static async getUnreadCount(userId: string): Promise<number> {
    // First get all active chat session IDs for the user
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('id')
      .or(`post_owner_id.eq.${userId},helper_id.eq.${userId}`)
      .eq('status', 'active');

    if (sessionsError) {
      throw new Error(`Failed to get user sessions: ${sessionsError.message}`);
    }

    if (!sessions || sessions.length === 0) {
      return 0;
    }

    const sessionIds = sessions.map(s => s.id);

    // Count unread messages in these sessions (excluding messages sent by the user)
    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .in('session_id', sessionIds)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new Error(`Failed to get unread count: ${error.message}`);
    }

    return count || 0;
  }

  // Delete a chat session (only by post owner)
  static async deleteSession(sessionId: string, postOwnerId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('post_owner_id', postOwnerId);

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }
}