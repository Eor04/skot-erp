'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export type BranchType = 'ACAI' | 'HAMBURGUESAS' | 'FABRICA';

export interface User {
    userId: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAREHOUSE';
    branchIds: string[];
    /** Tipos de sucursal a las que tiene acceso el usuario */
    branchTypes: BranchType[];
}

interface SessionContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
    user: null,
    loading: true,
    logout: async () => { },
});

export function SessionProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => r.json())
            .then(d => { if (d.success) setUser(d.user); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setUser(null);
        router.push('/login');
        router.refresh();
    };

    return (
        <SessionContext.Provider value={{ user, loading, logout }}>
            {children}
        </SessionContext.Provider>
    );
}

export const useSession = () => useContext(SessionContext);
