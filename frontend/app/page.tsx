'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Chat, createAxiosInstance, createSocketConnection, Thread } from '@/lib/api';
import { ChatInterface } from '@/components/chat-interface';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { ThreadList } from '@/components/thread-list';
import { toast } from 'sonner';

export default function HomePage() {
  const { token, logout } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [currentChats, setCurrentChats] = useState<Chat[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (token === null) {
      logout();
    }
    if (!token) return;

    const api = createAxiosInstance(token);
    const socketConnection = createSocketConnection(token);
    setSocket(socketConnection);

    // Fetch threads
    const fetchThreads = async () => {
      try {
        const response = await api.get('/threads');
        setThreads(response.data);
      } catch (error) {
        console.error('Failed to fetch threads:', error);
      }
    };

    fetchThreads();

    return () => {
      socketConnection.disconnect();
    };
  }, [token, logout]);

  const handleCreateThread = async () => {
    if (!token) return;

    try {
      const api = createAxiosInstance(token);
      const response = await api.post('/threads');
      const newThread = response.data;
      setThreads(prev => [...prev, newThread]);
      setCurrentThread(newThread);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const handleThreadSelect = async (thread: Thread) => {
    if (!token) return;

    try {
      const api = createAxiosInstance(token);
      const response = await api.get<Chat[]>(`/threads/${thread.id}/chats`);
      setCurrentThread(thread);
      setCurrentChats(response.data);

    } catch (error) {
      // @ts-expect-error - Ignore toast type error
      if (error?.data?.detail) {
        // @ts-expect-error - Ignore toast type error
        toast.error(error.data.detail);
        return;
      }
      toast.error('Failed to fetch thread chats');
    }
  };

  if (!token) return null;

  return (
    <div className="flex h-screen">
      <div className="flex flex-col w-64">
        <div className="p-4 border-b">
          <Button onClick={handleCreateThread} className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Thread
          </Button>
        </div>
        <ThreadList
          threads={threads}
          onSelect={handleThreadSelect}
          currentThread={currentThread}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            {currentThread ? currentThread.title : 'Select a Thread'}
          </h1>
          <Button variant="ghost" onClick={logout}>
            Logout
          </Button>
        </div>
        {currentThread && socket ? (
          <ChatInterface
            socket={socket}
            currentThread={currentThread}
            onThreadSelect={setCurrentThread}
            currentChats={currentChats}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a thread or create a new one to start chatting
          </div>
        )}
      </div>
    </div>
  );
}