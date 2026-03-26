import { useNetworkStatus } from '@/hooks/use-network-status';
import { useSyncQueue } from '@/hooks/use-sync-queue';
import { useEffect, useState } from 'react';

export function OfflineBanner() {
    const isOnline = useNetworkStatus();
    const { queue } = useSyncQueue();
    const [showBanner, setShowBanner] = useState(false);

    const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'failed');
    const syncingItems = queue.filter(item => item.status === 'syncing');

    useEffect(() => {
        if (!isOnline || pendingItems.length > 0 || syncingItems.length > 0) {
            setShowBanner(true);
        } else {
            const timer = setTimeout(() => setShowBanner(false), 2000); // Ocultar después de 2s si todo está OK
            return () => clearTimeout(timer);
        }
    }, [isOnline, pendingItems.length, syncingItems.length]);

    if (!showBanner) return null;

    let message = '';
    let bgColor = '';

    if (!isOnline) {
        message = 'Modo Offline: Los cambios se guardarán localmente.';
        bgColor = 'bg-yellow-500';
    } else if (syncingItems.length > 0) {
        message = `Sincronizando ${syncingItems.length} cambios...`;
        bgColor = 'bg-blue-500';
    } else if (pendingItems.length > 0) {
        message = `${pendingItems.length} cambios pendientes de sincronización.`;
        bgColor = 'bg-orange-500';
    } else {
        message = 'Conexión restablecida. Todo sincronizado.';
        bgColor = 'bg-green-500';
    }

    return (
        <div className={`fixed bottom-0 left-0 right-0 p-2 text-white text-center text-sm font-medium ${bgColor} transition-colors duration-300 z-50`}>
            {message}
        </div>
    );
}
