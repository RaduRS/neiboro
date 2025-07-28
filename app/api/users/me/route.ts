import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { UserServiceAdmin } from '@/lib/user-service-admin';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserServiceAdmin.getByClerkId(userId);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateData = await request.json();
    
    // Check if user exists
    const existingUser = await UserServiceAdmin.getByClerkId(userId);
    
    if (existingUser) {
      // Update existing user
      const updatedUser = await UserServiceAdmin.update(userId, updateData);
      return NextResponse.json({ user: updatedUser });
    } else {
      // Create new user
      const newUser = await UserServiceAdmin.create({
        clerk_id: userId,
        ...updateData
      });
      return NextResponse.json({ user: newUser });
    }
  } catch (error) {
    console.error('Error updating/creating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}