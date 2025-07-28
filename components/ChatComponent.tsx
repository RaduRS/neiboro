'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { ChatMessage, ChatSession } from '@/lib/types';
import { useRealtime } from '@/lib/useRealtime';
import { supabase } from '@/lib/supabase';

interface ChatComponentProps {
  sessionId: string;
  onClose?: () => void;
}

export default function ChatComponent({ sessionId, onClose }: ChatComponentProps) {
  const { user } = useUser();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Supabase Realtime integration
  const { subscribeToChatMessages } = useRealtime({ 
    chatSessionId: sessionId 
  });

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch session and messages
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch session details
        const sessionResponse = await fetch(`/api/chat/${sessionId}`);
        const sessionResult = await sessionResponse.json();
        
        if (sessionResult.success) {
          setSession(sessionResult.data);
        }

        // Fetch messages
        const messagesResponse = await fetch(`/api/chat/${sessionId}/messages`);
        const messagesResult = await messagesResponse.json();
        
        if (messagesResult.success) {
          setMessages(messagesResult.data);
        }
      } catch (err) {
        setError('Failed to load chat');
        console.error('Error loading chat:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  // Set up real-time connection
  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to chat messages
    const channel = subscribeToChatMessages((message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sessionId]); // Removed subscribeToChatMessages from dependencies

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      const response = await fetch(`/api/chat/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNewMessage('');
      } else {
        setError(result.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading chat...</div>
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

  return (
    <div className="flex flex-col h-full max-h-96 bg-white rounded-lg border shadow-sm">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
        <div>
          <h3 className="font-semibold text-gray-900">
            Chat Session
          </h3>
          {session && (
            <p className="text-sm text-gray-600">
              Status: <span className="capitalize">{session.status}</span>
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  message.sender_id === user?.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.message}</p>
                <p className={`text-xs mt-1 ${
                  message.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}