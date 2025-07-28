import { supabase, supabaseAdmin } from './supabase';
import type { Cluster } from './types';
import { normalizePostcode } from './postcode-utils';

export class ClusterService {
  // Get all clusters
  static async getAll(): Promise<Cluster[]> {
    const { data, error } = await supabase
      .from('clusters')
      .select('*')
      .order('area_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to get clusters: ${error.message}`);
    }

    return data || [];
  }

  // Get cluster by ID
  static async getById(id: string): Promise<Cluster | null> {
    const { data, error } = await supabase
      .from('clusters')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Cluster not found
      }
      throw new Error(`Failed to get cluster: ${error.message}`);
    }

    return data;
  }

  // Get cluster by postcode
  static async getByPostcode(postcode: string): Promise<Cluster | null> {
    const normalizedPostcode = normalizePostcode(postcode);
    
    const { data, error } = await supabase
      .from('clusters')
      .select('*')
      .eq('postcode', normalizedPostcode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Cluster not found
      }
      throw new Error(`Failed to get cluster by postcode: ${error.message}`);
    }

    return data;
  }

  // Search clusters by postcode prefix (for autocomplete)
  static async searchByPostcode(postcodePrefix: string, limit = 10): Promise<Cluster[]> {
    const { data, error } = await supabase
      .from('clusters')
      .select('*')
      .ilike('postcode', `${postcodePrefix}%`)
      .order('postcode', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search clusters: ${error.message}`);
    }

    return data || [];
  }

  // Create a new cluster (admin only)
  static async create(clusterData: { 
    postcode: string; 
    area_name: string;
    city?: string;
    county?: string;
    country?: string;
  }): Promise<Cluster> {
    const { data, error } = await supabase
      .from('clusters')
      .insert({
        postcode: clusterData.postcode,
        area_name: clusterData.area_name,
        city: clusterData.city,
        county: clusterData.county,
        country: clusterData.country || 'United Kingdom'
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create cluster: ${error.message}`);
    }

    return data;
  }

  // Update cluster (admin only)
  static async update(id: string, clusterData: { 
    postcode?: string; 
    area_name?: string;
    city?: string;
    county?: string;
    country?: string;
  }): Promise<Cluster> {
    const { data, error } = await supabase
      .from('clusters')
      .update({
        postcode: clusterData.postcode,
        area_name: clusterData.area_name,
        city: clusterData.city,
        county: clusterData.county,
        country: clusterData.country
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update cluster: ${error.message}`);
    }

    return data;
  }

  // Delete cluster (admin only)
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clusters')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete cluster: ${error.message}`);
    }
  }

  // Check if a cluster exists for a given postcode
  static async existsForPostcode(postcode: string): Promise<boolean> {
    const normalizedPostcode = normalizePostcode(postcode);
    
    const { data, error } = await supabase
      .from('clusters')
      .select('id')
      .eq('postcode', normalizedPostcode)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check cluster existence: ${error.message}`);
    }

    return !!data;
  }

  // Get cluster details for joining
  static async getClusterForJoining(postcode: string): Promise<Cluster | null> {
    const normalizedPostcode = normalizePostcode(postcode);
    
    // If we're on the client side (browser), use the API endpoint
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/clusters?postcode=${encodeURIComponent(normalizedPostcode)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        return result.cluster;
      } catch (error) {
        console.error('Error fetching cluster from API:', error);
        return null;
      }
    }
    
    // Server-side: use admin client directly
    if (!supabaseAdmin) {
      throw new Error('Admin client not available on server side');
    }
    
    const { data, error } = await supabaseAdmin
      .from('clusters')
      .select('*')
      .eq('postcode', normalizedPostcode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No cluster found
      }
      throw new Error(`Failed to get cluster: ${error.message}`);
    }

    return data;
  }
}