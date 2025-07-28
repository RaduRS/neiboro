import { supabaseAdmin } from './supabase';
import type { Post, CreatePostData, UpdatePostData } from './types';

// Server-side PostService that bypasses RLS using service role
export class PostServiceAdmin {
  static async getAll(limit?: number): Promise<Post[]> {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available on client side');
    }

    let query = supabaseAdmin
      .from('posts')
      .select(`
        *,
        user:users(id, first_name, last_name, profile_image_url, cluster_id)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get posts: ${error.message}`);
    }

    return data || [];
  }

  static async getByType(postType: 'help_needed' | 'help_offered', limit?: number): Promise<Post[]> {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available on client side');
    }

    let query = supabaseAdmin
      .from('posts')
      .select(`
        *,
        user:users(id, first_name, last_name, profile_image_url, cluster_id)
      `)
      .eq('post_type', postType)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get posts by type: ${error.message}`);
    }

    return data || [];
  }

  static async getByCluster(clusterId: string, limit?: number): Promise<Post[]> {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available on client side');
    }

    let query = supabaseAdmin
      .from('posts')
      .select(`
        *,
        user:users!inner(id, first_name, last_name, profile_image_url, cluster_id)
      `)
      .eq('user.cluster_id', clusterId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get posts by cluster: ${error.message}`);
    }

    return data || [];
  }

  static async getById(id: string): Promise<Post | null> {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available on client side');
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        user:users(id, first_name, last_name, profile_image_url, cluster_id)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Post not found
      }
      throw new Error(`Failed to get post: ${error.message}`);
    }

    return data;
  }

  static async getByUserId(userId: string): Promise<Post[]> {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available on client side');
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        user:users(id, first_name, last_name, profile_image_url, cluster_id)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get posts by user: ${error.message}`);
    }

    return data || [];
  }

  static async create(userId: string, postData: CreatePostData): Promise<Post> {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available on client side');
    }

    // Validate user exists and has a cluster
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, cluster_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found or not authorized');
    }

    if (!user.cluster_id) {
      throw new Error('User must be part of a cluster to create posts');
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        user_id: userId,
        title: postData.title,
        description: postData.description,
        post_type: postData.post_type
      })
      .select(`
        *,
        user:users(id, first_name, last_name, profile_image_url, cluster_id)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }

    return data;
  }

  static async update(id: string, postData: UpdatePostData): Promise<Post> {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available on client side');
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .update({
        title: postData.title,
        description: postData.description,
        post_type: postData.post_type,
        is_active: postData.is_active
      })
      .eq('id', id)
      .select(`
        *,
        user:users(id, first_name, last_name, profile_image_url, cluster_id)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }

    return data;
  }

  static async delete(id: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available on client side');
    }

    const { error } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
    }
  }

  static async deactivate(id: string): Promise<Post> {
    return this.update(id, { is_active: false });
  }

  static async activate(id: string): Promise<Post> {
    return this.update(id, { is_active: true });
  }
}