import { supabase } from './supabase';
import { PostResponse, CreatePostResponseData } from './types';

export class PostResponseService {
  /**
   * Get all responses for a specific post
   */
  static async getByPostId(postId: string): Promise<PostResponse[]> {
    try {
      const { data, error } = await supabase
        .from('post_responses')
        .select(`
          *,
          user:users(id, first_name, last_name, profile_image_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting post responses:', error);
      return [];
    }
  }

  /**
   * Get all responses by a specific user
   */
  static async getByUserId(userId: string): Promise<PostResponse[]> {
    try {
      const { data, error } = await supabase
        .from('post_responses')
        .select(`
          *,
          post:posts(id, title, post_type),
          user:users(id, first_name, last_name, profile_image_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user responses:', error);
      return [];
    }
  }

  /**
   * Get unread responses for posts owned by a user
   */
  static async getUnreadForUser(userId: string): Promise<PostResponse[]> {
    try {
      const { data, error } = await supabase
        .from('post_responses')
        .select(`
          *,
          user:users(id, first_name, last_name, profile_image_url),
          post:posts!inner(id, title, user_id)
        `)
        .eq('post.user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting unread responses:', error);
      return [];
    }
  }

  /**
   * Create a new post response
   */
  static async create(responseData: CreatePostResponseData & { user_id: string }): Promise<PostResponse | null> {
    try {
      const { data, error } = await supabase
        .from('post_responses')
        .insert([responseData])
        .select(`
          *,
          user:users(id, first_name, last_name, profile_image_url),
          post:posts(id, title, post_type)
        `)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating post response:', error);
      return null;
    }
  }

  /**
   * Mark a response as read
   */
  static async markAsRead(responseId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('post_responses')
        .update({ is_read: true })
        .eq('id', responseId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error marking response as read:', error);
      return false;
    }
  }

  /**
   * Mark all responses for a post as read
   */
  static async markAllAsReadForPost(postId: string, userId: string): Promise<boolean> {
    try {
      // First verify the user owns the post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id')
        .eq('id', postId)
        .eq('user_id', userId)
        .single();

      if (postError || !post) {
        console.error('User does not own this post or post not found');
        return false;
      }

      // Mark all responses for this post as read
      const { error } = await supabase
        .from('post_responses')
        .update({ is_read: true })
        .eq('post_id', postId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error marking all responses as read:', error);
      return false;
    }
  }

  /**
   * Delete a response
   */
  static async delete(responseId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('post_responses')
        .delete()
        .eq('id', responseId)
        .eq('user_id', userId); // Only allow users to delete their own responses

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting response:', error);
      return false;
    }
  }

  /**
   * Check if user has already responded to a post
   */
  static async hasUserResponded(postId: string, userId: string, responseType: 'offer_help' | 'comment' = 'offer_help'): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('post_responses')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('response_type', responseType)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking user response:', error);
      return false;
    }
  }
}