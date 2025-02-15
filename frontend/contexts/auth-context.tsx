"use client";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { BASE_URL } from '@/lib/api';

interface AuthContextType {
    token: string | null;
    login: (token: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>("");
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const verifyToken = useCallback(async (token: string) => {
        try {
            await axios.post(`${BASE_URL}/auth/verify`, null, {
                params: { token }
            });
            setToken(token);
            localStorage.setItem('token', token);
        } catch (error) {
            localStorage.removeItem('token');
            setToken(null)
            if (error instanceof AxiosError)
                throw error.response;
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            verifyToken(storedToken);
        } else {
            setToken(null);
            setIsLoading(false);
        }
    }, [verifyToken]);

    const login = async (token: string) => {
        await verifyToken(token);
        router.push('/');
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}