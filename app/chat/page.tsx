import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ChatSessionsList from '@/components/ChatSessionsList';

export default async function ChatPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">
            Chat with neighbors who are helping or need help in your community.
          </p>
        </div>

        <ChatSessionsList />
      </div>
    </div>
  );
}