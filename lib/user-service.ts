import { supabase } from './supabase';
import type { User, CreateUserData, UpdateUserData } from './types';

export class UserService {
  static async getByClerkId(clerkId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // User not found
      }
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data;
  }

  static async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // User not found
      }
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data;
  }

  static async create(userData: CreateUserData): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        clerk_id: userData.clerk_id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        profile_image_url: userData.profile_image_url,
        address_line1: userData.address_line1,
        address_line2: userData.address_line2,
        city: userData.city,
        cluster_id: userData.cluster_id,
        role: userData.role || 'user'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  static async update(clerkId: string, userData: UpdateUserData): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({
        first_name: userData.first_name,
        last_name: userData.last_name,
        profile_image_url: userData.profile_image_url,
        address_line1: userData.address_line1,
        address_line2: userData.address_line2,
        city: userData.city,
        cluster_id: userData.cluster_id,
        role: userData.role
      })
      .eq('clerk_id', clerkId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  }

  static async delete(clerkId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('clerk_id', clerkId);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  static async getUsersInCluster(clusterId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('cluster_id', clusterId);

    if (error) {
      throw new Error(`Failed to get users in cluster: ${error.message}`);
    }

    return data || [];
  }
}