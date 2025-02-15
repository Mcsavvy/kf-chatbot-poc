"use client";
import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
        if (error.message.includes('401') || error.message.includes('403')) {
            // Handle authentication errors
            // @ts-expect-error - Ignore window type error
            const auth = window.__auth;
            if (auth?.logout) {
                auth.logout();
            } else {
                // Fallback if auth context is not available
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertTitle>Something went wrong</AlertTitle>
                        <AlertDescription>
                            {this.state.error?.message}
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => window.location.reload()}
                            >
                                Reload page
                            </Button>
                        </AlertDescription>
                    </Alert>
                </div>
            );
        }

        return this.props.children;
    }
}

// ErrorBoundary wrapper with auth context
export function ErrorBoundaryWithAuth({ children }: { children: React.ReactNode }) {
    const auth = useAuth();

    // Store auth in window for access in class component
    React.useEffect(() => {
        //@ts-expect-error - Ignore window type error
        window.__auth = auth;
    }, [auth]);

    return <ErrorBoundary>{children}</ErrorBoundary>;
}