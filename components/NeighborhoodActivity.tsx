'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Post, PostResponse, User } from '@/lib/types';
import { useRealtime } from '@/lib/useRealtime';

interface NeighborhoodActivityProps {
  userClusterId: string;
}

export default function NeighborhoodActivity({ userClusterId }: NeighborhoodActivityProps) {
  const { user: clerkUser } = useUser();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', post_type: 'help_needed' as 'help_needed' | 'help_offered' });
  const [helpingPosts, setHelpingPosts] = useState<Set<string>>(new Set());
  const [postResponses, setPostResponses] = useState<Record<string, PostResponse[]>>({});
  
  // Supabase Realtime integration
  const { subscribeToClusterPosts, subscribeToClusterPostResponses } = useRealtime({ 
    clusterId: userClusterId 
  });

  // Fetch current user from database
  const fetchCurrentUser = useCallback(async () => {
    if (!clerkUser?.id) return;
    
    try {
      const response = await fetch('/api/users/me');
      const result = await response.json();
      if (result.user) {
        setCurrentUser(result.user);
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  }, [clerkUser?.id]);

  // Fetch current user's database record
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Fetch posts function
  const fetchPosts = useCallback(async () => {
    try {
      const response = await fetch(`/api/posts?cluster_id=${userClusterId}&limit=10`);
      const result = await response.json();
      
      if (result.success) {
        setPosts(result.data);
        // Fetch responses for each post
        result.data.forEach((post: Post) => {
          fetchPostResponses(post.id);
        });
      } else {
        setError('Failed to load posts');
      }
    } catch (err) {
      setError('Failed to load posts');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, [userClusterId]);

  // Fetch post responses
  const fetchPostResponses = useCallback(async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/responses`);
      const result = await response.json();
      
      if (result.success) {
        setPostResponses(prev => ({
          ...prev,
          [postId]: result.data
        }));
      }
    } catch (err) {
      console.error('Error fetching post responses:', err);
    }
  }, []);

  // Setup real-time connection
  useEffect(() => {
    fetchPosts();

    // Subscribe to post changes in the cluster
    const postChannel = subscribeToClusterPosts(
      // onPostCreated
      (newPost: Post) => {
        setPosts(prevPosts => [newPost, ...prevPosts]);
        fetchPostResponses(newPost.id);
      },
      // onPostUpdated
      (updatedPost: Post) => {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === updatedPost.id ? updatedPost : post
          )
        );
      },
      // onPostDeleted
      (deletedPostId: string) => {
        setPosts(prevPosts => 
          prevPosts.filter(post => post.id !== deletedPostId)
        );
        setPostResponses(prev => {
          const newResponses = { ...prev };
          delete newResponses[deletedPostId];
          return newResponses;
        });
      }
    );

    // Subscribe to post responses in the cluster
    const responseChannel = subscribeToClusterPostResponses(
      (newResponse: PostResponse) => {
        setPostResponses(prev => ({
          ...prev,
          [newResponse.post_id]: [
            ...(prev[newResponse.post_id] || []),
            newResponse
          ]
        }));
      }
    );

    // Cleanup subscriptions on unmount
    return () => {
      if (postChannel) {
        // Channels are automatically cleaned up by useRealtime hook
      }
    };
  }, [userClusterId, fetchPosts, fetchPostResponses]);

  // Handle "I can help" button
  const handleOfferHelp = async (postId: string) => {
    if (!currentUser?.id) return;

    try {
      setHelpingPosts(prev => new Set(prev).add(postId));
      
      const response = await fetch(`/api/posts/${postId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response_type: 'offer_help'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to offer help');
        setHelpingPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      }
    } catch (err) {
      alert('Failed to offer help');
      console.error('Error offering help:', err);
      setHelpingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  // Check if user has already offered help
  const hasUserOfferedHelp = (postId: string) => {
    const responses = postResponses[postId] || [];
    return responses.some(response => 
      response.user_id === currentUser?.id && response.response_type === 'offer_help'
    );
  };

  // Get help offers count
  const getHelpOffersCount = (postId: string) => {
    const responses = postResponses[postId] || [];
    return responses.filter(response => response.response_type === 'offer_help').length;
  };

  // Handle post deletion
  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete post');
      }
    } catch (err) {
      alert('Failed to delete post');
      console.error('Error deleting post:', err);
    }
  };

  // Handle post editing
  const startEdit = (post: Post) => {
    setEditingPost(post.id);
    setEditForm({
      title: post.title,
      description: post.description,
      post_type: post.post_type
    });
  };

  const cancelEdit = () => {
    setEditingPost(null);
    setEditForm({ title: '', description: '', post_type: 'help_needed' });
  };

  const saveEdit = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setEditingPost(null);
        setEditForm({ title: '', description: '', post_type: 'help_needed' });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update post');
      }
    } catch (err) {
      alert('Failed to update post');
      console.error('Error updating post:', err);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Neighborhood Activity</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Neighborhood Activity</h3>
        <div className="text-red-600 text-center py-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recent Neighborhood Activity</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Live</span>
        </div>
      </div>
      
      {posts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No posts yet in your neighborhood.</p>
          <p className="text-sm mt-1">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              {editingPost === post.id ? (
                // Edit form
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Title"
                    maxLength={100}
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description"
                    rows={3}
                    maxLength={500}
                  />
                  <select
                    value={editForm.post_type}
                    onChange={(e) => setEditForm(prev => ({ ...prev, post_type: e.target.value as 'help_needed' | 'help_offered' }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="help_needed">Help Needed</option>
                    <option value="help_offered">Help Offered</option>
                  </select>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => saveEdit(post.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {post.user?.first_name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {post.user?.first_name} {post.user?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{formatTimeAgo(post.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        post.post_type === 'help_needed' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {post.post_type === 'help_needed' ? 'Help Needed' : 'Help Offered'}
                      </span>
                      {currentUser?.id && post.user_id === currentUser.id && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => startEdit(post)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-900">{post.title}</h4>
                    <p className="text-gray-700 mt-1">{post.description}</p>
                  </div>
                  
                  {/* Help offers section */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Show help offers count */}
                      {getHelpOffersCount(post.id) > 0 && (
                        <span className="text-sm text-gray-600">
                          {getHelpOffersCount(post.id)} {getHelpOffersCount(post.id) === 1 ? 'person' : 'people'} offered to help
                        </span>
                      )}
                    </div>
                    
                    {/* I can help button - only show for help_needed posts and if user hasn't already offered */}
                    {post.post_type === 'help_needed' && currentUser?.id && post.user_id !== currentUser.id && (
                      <div>
                        {hasUserOfferedHelp(post.id) ? (
                          <span className="text-sm text-green-600 font-medium">✓ You offered to help</span>
                        ) : (
                          <button
                            onClick={() => handleOfferHelp(post.id)}
                            disabled={helpingPosts.has(post.id)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {helpingPosts.has(post.id) ? 'Offering...' : 'I can help'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}