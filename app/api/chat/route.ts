import { NextResponse } from 'next/server';
import { ChatService } from '@/lib/chat-service';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await ChatService.getUserSessions(userId);

    return NextResponse.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { post_response_id, helper_id } = await request.json();

    if (!post_response_id || !helper_id) {
      return NextResponse.json(
        { error: 'post_response_id and helper_id are required' },
        { status: 400 }
      );
    }

    const session = await ChatService.createSession(userId, {
      post_response_id,
      helper_id
    });

    return NextResponse.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}