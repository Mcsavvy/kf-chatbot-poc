import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import {
    Send,
    Loader2,
    Search,
    Database,
    BrainCircuit,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { Thread, Chat, ChatStatus } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface ExtendedChat extends Chat {
    status?: ChatStatus;
    streamedContent?: string;
}

interface ChatMessageProps {
    chat: ExtendedChat;
}

const getStatusIcon = (phase: string) => {
    switch (phase) {
        case 'started':
            return <Loader2 className="h-4 w-4 animate-spin" />;
        case 'searching':
            return <Search className="h-4 w-4" />;
        case 'retrieving':
            return <Database className="h-4 w-4" />;
        case 'embedding':
            return <BrainCircuit className="h-4 w-4" />;
        case 'processing':
            return <Loader2 className="h-4 w-4 animate-spin" />;
        case 'completed':
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'error':
            return <AlertCircle className="h-4 w-4 text-red-500" />;
        default:
            return <Loader2 className="h-4 w-4 animate-spin" />;
    }
};

function ChatMessage({ chat }: ChatMessageProps) {
    return (
        <div className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <Card className={`max-w-[80%] ${chat.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <CardContent className="p-4 space-y-2">
                    {chat.status && chat.status.phase !== 'completed' && (
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <div className="flex items-center gap-2">
                                {getStatusIcon(chat.status.phase)}
                                <p className="text-xs text-gray-500">
                                    {chat.status.message}
                                </p>
                            </div>
                        </div>
                    )}
                    <p className="whitespace-pre-wrap">
                        {chat.streamedContent || chat.content}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

interface ChatInterfaceProps {
    socket: Socket;
    currentThread: Thread | null;
    currentChats: Chat[];
    onThreadSelect: (thread: Thread) => void;
}

export function ChatInterface({ socket, currentThread, currentChats, onThreadSelect }: ChatInterfaceProps) {
    const [message, setMessage] = useState('');
    const [chats, setChats] = useState<ExtendedChat[]>([]);

    useEffect(() => {
        setChats(currentChats);
    }, [currentChats]);

    useEffect(() => {
        const handleStatus = (newStatus: ChatStatus) => {
            setChats(prevChats => {
                return prevChats.map(chat => {
                    if (chat.id === newStatus.chat_id) {
                        return { ...chat, status: newStatus };
                    }
                    return chat;
                });
            });
        };

        const handleResponseChunk = ({ chunk, chat_id }: { chunk: string; chat_id: number }) => {
            console.log("chunk", chunk);
            setChats(prevChats => {
                return prevChats.map(chat => {
                    if (chat.id === chat_id) {
                        return {
                            ...chat,
                            streamedContent: (chat.streamedContent || '') + chunk
                        };
                    }
                    return chat;
                });
            });
        };

        const handleChatMessage = (message: {
            chat_id: number,
            thread_id: number,
            content: string,
            role: "user" | "assistant",
            created_at: string
        }) => {
            setChats(prevChats => {
                // Check if message already exists
                const exists = prevChats.some(chat => chat.id === message.chat_id);
                if (!exists) {
                    return [...prevChats, {
                        id: message.chat_id,
                        content: message.content,
                        role: message.role,
                        created_at: message.created_at
                    }];
                }
                return prevChats;
            });
        };

        const handleThreadInfo = (threadInfo: {
            thread_id: number;
            title: string;
            created_at: string;
            is_new: boolean;
        }) => {
            if (threadInfo.is_new) {
                onThreadSelect({
                    id: threadInfo.thread_id,
                    title: threadInfo.title,
                    created_at: threadInfo.created_at
                });
            }
        };


        socket.on('status', handleStatus);
        socket.on('response_chunk', handleResponseChunk);
        socket.on('chat_message', handleChatMessage);
        socket.on('thread_info', handleThreadInfo);


        return () => {
            socket.off('status', handleStatus);
            socket.off('response_chunk', handleResponseChunk);
            socket.off('chat_message', handleChatMessage);
            socket.off('thread_info', handleThreadInfo);
        };
    }, [socket, onThreadSelect]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !currentThread) return;

        socket.emit('chat_message', {
            message,
            thread_id: currentThread.id
        });

        setMessage('');
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chats.map((chat) => (
                    <ChatMessage key={chat.id} chat={chat} />
                ))}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex gap-2">
                    <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1"
                    />
                    <Button type="submit" disabled={!message.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </form>
        </div>
    );
}
