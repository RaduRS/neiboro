import { NextResponse } from 'next/server';
import { PostResponseService } from '@/lib/post-response-service';
import { UserServiceAdmin } from '@/lib/user-service-admin';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const responses = await PostResponseService.getByPostId(id);
    
    return NextResponse.json({
      success: true,
      data: responses
    });
  } catch (error) {
    console.error('Error fetching post responses:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch post responses',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;
    const body = await request.json();
    const { response_type, message } = body;

    // Validate input
    if (!response_type || !['offer_help', 'comment'].includes(response_type)) {
      return NextResponse.json(
        { error: 'Invalid response_type. Must be "offer_help" or "comment"' },
        { status: 400 }
      );
    }

    if (response_type === 'comment' && !message) {
      return NextResponse.json(
        { error: 'Message is required for comments' },
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

    // Check if user has already responded with the same type
    const hasResponded = await PostResponseService.hasUserResponded(postId, user.id, response_type);
    if (hasResponded) {
      return NextResponse.json(
        { error: `You have already ${response_type === 'offer_help' ? 'offered to help' : 'commented on'} this post` },
        { status: 409 }
      );
    }

    const response = await PostResponseService.create({
      post_id: postId,
      user_id: user.id,
      response_type,
      message: message || null
    });

    // Supabase Realtime will automatically broadcast the new response to subscribers

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Error creating post response:', error);
    return NextResponse.json(
      { error: 'Failed to create post response' },
      { status: 500 }
    );
  }
}