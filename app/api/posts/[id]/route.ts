import { NextResponse } from 'next/server';
import { PostServiceAdmin } from '@/lib/post-service-admin';
import { UserServiceAdmin } from '@/lib/user-service-admin';
import { auth } from '@clerk/nextjs/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    // Get user to verify they exist
    const user = await UserServiceAdmin.getByClerkId(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the post to verify ownership
    const existingPost = await PostServiceAdmin.getById(id);
    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own posts' },
        { status: 403 }
      );
    }

    const updatedPost = await PostServiceAdmin.update(id, {
      title,
      description,
      post_type
    });

    // Supabase Realtime will automatically broadcast the updated post to subscribers

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user to verify they exist
    const user = await UserServiceAdmin.getByClerkId(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the post to verify ownership
    const existingPost = await PostServiceAdmin.getById(id);
    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    await PostServiceAdmin.delete(id);

    // Supabase Realtime will automatically broadcast the deletion to subscribers

    return NextResponse.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}