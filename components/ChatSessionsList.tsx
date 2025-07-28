'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { ChatSession } from '@/lib/types';
import ChatComponent from './ChatComponent';

export default function ChatSessionsList() {
  const { user } = useUser();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch chat sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/chat');
        const result = await response.json();
        
        if (result.success) {
          setSessions(result.data);
        } else {
          setError(result.error || 'Failed to load chat sessions');
        }
      } catch (err) {
        setError('Failed to load chat sessions');
        console.error('Error loading chat sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSessions();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading chat sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (selectedSession) {
    return (
      <ChatComponent 
        sessionId={selectedSession} 
        onClose={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-gray-900">Your Chat Sessions</h3>
      </div>
      
      <div className="p-4">
        {sessions.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No chat sessions yet. When someone offers to help with your posts, you&apos;ll see chat sessions here.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session.id)}
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {session.post_response?.post?.title || 'Chat Session'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        session.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : session.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      With: {session.helper?.first_name || 'Helper'}
                    </p>
                    
                    {session.latest_message && (
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        Last: {session.latest_message.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(session.updated_at).toLocaleDateString()}
                    </p>
                    {session.unread_count && session.unread_count > 0 && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                        {session.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}