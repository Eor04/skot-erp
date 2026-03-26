import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';

// 1. Configurar Persister con idb-keyval (Async Storage)
// Adaptador para IDB que cumple con la interfaz de Persister
const idbPersister = {
    persistClient: async (client: any) => {
        await set('react-query-cache', client);
    },
    restoreClient: async () => {
        return await get('react-query-cache');
    },
    removeClient: async () => {
        await del('react-query-cache');
    },
};

// 2. Crear QueryClient con Defaults
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos (Datos frescos por 5 min)
            gcTime: 1000 * 60 * 60 * 24, // 24 horas (Cache persiste 24h) - antes cacheTime
            retry: 3,
            refetchOnWindowFocus: false, // Evitar refetch agresivo en mobile
            networkMode: 'offlineFirst', // CRÍTICO: Permite queries sin red
        },
        mutations: {
            networkMode: 'offlineFirst', // CRÍTICO: Permite mutaciones sin red
        },
    },
});

// 3. Inicializar Persistencia (Solo en cliente)
if (typeof window !== 'undefined') {
    persistQueryClient({
        queryClient,
        persister: idbPersister,
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
        buster: 'v1', // Incrementar para invalidar caché antigua en updates
    });
}
