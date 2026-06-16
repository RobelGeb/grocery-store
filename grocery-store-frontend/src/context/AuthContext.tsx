import { createContext, useContext, useState, type ReactNode } from 'react';
import { signIn, signOut as AmplifySignOut, fetchAuthSession } from 'aws-amplify/auth';

interface AuthContextType {
    accessToken: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(
        localStorage.getItem('adminToken')
    );

    const login = async (email: string, password: string) => {
        const { isSignedIn, nextStep } = await signIn({ username: email, password });
        if (!isSignedIn) throw new Error(`Auth step required: ${nextStep.signInStep}`);

        // Get the access token from the active session
        const session = await fetchAuthSession();
        const token = session.tokens?.accessToken?.toString();
        if (!token) throw new Error('No access token returned');

        localStorage.setItem('adminToken', token);
        setAccessToken(token);
    };

    const logout = () => {
        AmplifySignOut();
        localStorage.removeItem('adminToken');
        setAccessToken(null);
    }

    return (
        <AuthContext.Provider value={{ accessToken, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}