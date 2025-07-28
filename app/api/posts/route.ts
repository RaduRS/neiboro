import { NextResponse } from 'next/server';
import { PostServiceAdmin } from '@/lib/post-service-admin';
import { UserServiceAdmin } from '@/lib/user-service-admin';
import { auth } from '@clerk/nextjs/server';

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_POSTS_PER_MINUTE = 5;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'help_needed' | 'help_offered' | null;
    const clusterId = searchParams.get('cluster_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    let posts;

    if (clusterId) {
      posts = await PostServiceAdmin.getByCluster(clusterId, limit);
    } else if (type) {
      posts = await PostServiceAdmin.getByType(type, limit);
    } else {
      posts = await PostServiceAdmin.getAll(limit);
    }

    return NextResponse.json({
      success: true,
      data: posts,
      count: posts.length
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch posts',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting check
    const now = Date.now();
    const userRateLimit = rateLimitMap.get(userId);
    
    if (userRateLimit) {
      if (now < userRateLimit.resetTime) {
        if (userRateLimit.count >= MAX_POSTS_PER_MINUTE) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please wait before creating another post.' },
            { status: 429 }
          );
        }
        userRateLimit.count++;
      } else {
        // Reset the rate limit window
        rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      }
    } else {
      // First request for this user
      rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }

    const body = await request.json();
    const { title, description, post_type } = body;

    // Validate input
    if (!title || !description || !post_type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, post_type' },
        { status: 400 }
      );
    }

    if (title.length > 100) {
      return NextResponse.json(
        { error: 'Title must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (description.length > 500) {
      return NextResponse.json(
        { error: 'Description must be 500 characters or less' },
        { status: 400 }
      );
    }

    if (!['help_needed', 'help_offered'].includes(post_type)) {
      return NextResponse.json(
        { error: 'Invalid post_type. Must be "help_needed" or "help_offered"' },
        { status: 400 }
      );
    }

    // Get user to verify they exist and have necessary permissions
    const user = await UserServiceAdmin.getByClerkId(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const post = await PostServiceAdmin.create(user.id, {
      title,
      description,
      post_type
    });

    // Supabase Realtime will automatically broadcast the new post to subscribers

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('Error creating post:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('User must be part of a cluster')) {
        return NextResponse.json(
          { error: 'You must join a neighborhood before creating posts' },
          { status: 403 }
        );
      }
      if (error.message.includes('User not found or not authorized')) {
        return NextResponse.json(
          { error: 'User not authorized' },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}