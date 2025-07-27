import { NextResponse } from 'next/server';
import { PostService } from '@/lib/post-service';
import { UserService } from '@/lib/user-service';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'help_needed' | 'help_offered' | null;
    const clusterId = searchParams.get('cluster_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    let posts;

    if (clusterId) {
      posts = await PostService.getByCluster(clusterId, limit);
    } else if (type) {
      posts = await PostService.getByType(type, limit);
    } else {
      posts = await PostService.getAll(limit);
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
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, post_type } = body;

    // Validate required fields
    if (!title || !description || !post_type) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: title, description, post_type'
      }, { status: 400 });
    }

    // Validate post_type
    if (!['help_needed', 'help_offered'].includes(post_type)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid post_type. Must be "help_needed" or "help_offered"'
      }, { status: 400 });
    }

    // Get user from database to ensure they exist
    const user = await UserService.getByClerkId(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    const post = await PostService.create(user.id, {
      title,
      description,
      post_type
    });

    return NextResponse.json({
      success: true,
      data: post,
      message: 'Post created successfully'
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create post',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}