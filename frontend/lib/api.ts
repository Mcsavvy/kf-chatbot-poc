import axios from 'axios';
import { io, Socket } from 'socket.io-client';

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Thread {
  id: number;
  title: string;
  created_at: string;
}

export interface Chat {
  id: number;
  content: string;
  role: "user" | "assistant";
  created_at: string;
}

export interface ChatStatus {
  phase: string;
  message: string;
  thread_id: number;
  chat_id: number;
}

export interface SearchResults {
  results: string;
  documents: Array<{
    title: string;
    relevance: number;
  }>;
  thread_id: number;
  chat_id: number;
}

export const createAxiosInstance = (token: string) => {
  const instance = axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  // instance.interceptors.response.use(
  //   response => response,
  //   error => {
  //     if (error.response?.status === 401) {
  //       localStorage.removeItem('token');
  //       window.location.href = '/login';
  //     }
  //     return Promise.reject(error);
  //   }
  // );

  return instance;
};

export const createSocketConnection = (token: string): Socket => {
  const socket = io(BASE_URL, {
    auth: {
      token
    },
    secure: BASE_URL?.startsWith('https'),
    reconnection: true,
    transports: ['websocket', 'polling']
  });

  return socket;
};