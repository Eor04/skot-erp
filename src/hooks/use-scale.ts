/**
 * HOOK REACT PARA INTEGRACIÓN CON BALANZA PRIX 4
 * 
 * Maneja la conexión, lectura continua, y detección de peso estable
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SerialConnection, ConnectionStatus } from '@/lib/scale/serial-connection';
import { parseWeightData, isWeightStable, validateWeight, WeightReading } from '@/lib/scale/prix4-protocol';

// Configuración de modo mock para desarrollo
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_SCALE === 'true';

export interface UseScaleOptions {
    tara?: number;              // Peso de tara en kg (se resta automáticamente)
    autoConnect?: boolean;      // Intentar conectar automáticamente al montar
    stabilityThreshold?: number; // Umbral para considerar peso estable (en kg)
    stabilityReadings?: number;  // Cantidad de lecturas consecutivas estables requeridas
}

export interface UseScaleState {
    status: ConnectionStatus;
    weight: number;              // Peso actual en kg (ya con tara restada)
    grossWeight: number;         // Peso bruto sin restar tara
    isStable: boolean;           // ¿Peso estabilizado?
    error: string | null;        // Mensaje de error
    lastReading: WeightReading | null; // Última lectura completa
}

/**
 * Hook para integrar balanza Prix 4 en componentes React
 */
export function useScale(options: UseScaleOptions = {}) {
    const {
        tara = 0,
        autoConnect = false,
        stabilityThreshold = 0.005,
        stabilityReadings = 3
    } = options;

    // Estado
    const [state, setState] = useState<UseScaleState>({
        status: 'disconnected',
        weight: 0,
        grossWeight: 0,
        isStable: false,
        error: null,
        lastReading: null
    });

    // Referencias
    const connectionRef = useRef<SerialConnection | null>(null);
    const lastWeightsRef = useRef<number[]>([]);
    const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Actualiza el estado del peso con nueva lectura
     */
    const updateWeight = useCallback((reading: WeightReading) => {
        const grossWeight = reading.weight;
        const netWeight = Math.max(0, grossWeight - tara); // No permitir pesos negativos

        // Guardar historial de pesos para detectar estabilidad
        lastWeightsRef.current = [...lastWeightsRef.current, grossWeight].slice(-stabilityReadings);

        // Verificar estabilidad: todas las últimas N lecturas deben estar dentro del umbral
        let stable = false;
        if (lastWeightsRef.current.length >= stabilityReadings) {
            stable = lastWeightsRef.current.every((w, i, arr) =>
                i === 0 || isWeightStable(w, arr[i - 1], stabilityThreshold)
            );
        }

        // Validar peso
        const validation = validateWeight(netWeight);

        setState(prev => ({
            ...prev,
            weight: netWeight,
            grossWeight,
            isStable: stable,
            error: validation.valid ? null : validation.error || null,
            lastReading: reading
        }));
    }, [tara, stabilityThreshold, stabilityReadings]);

    /**
     * Conectar a la balanza
     */
    const connect = useCallback(async () => {
        if (MOCK_MODE) {
            // Modo mock para desarrollo
            setState(prev => ({ ...prev, status: 'connected' }));

            // Simular lecturas de peso aleatorias
            mockIntervalRef.current = setInterval(() => {
                const mockWeight = 0.5 + Math.random() * 1.5; // Entre 0.5kg y 2kg
                updateWeight({
                    weight: mockWeight,
                    unit: 'kg',
                    stable: Math.random() > 0.3, // 70% probabilidad de estable
                    raw: `MOCK ${mockWeight.toFixed(3)} kg`
                });
            }, 500);

            return;
        }

        try {
            setState(prev => ({ ...prev, status: 'connecting', error: null }));

            // Crear conexión si no existe
            if (!connectionRef.current) {
                connectionRef.current = new SerialConnection({
                    onData: (data: ArrayBuffer) => {
                        const reading = parseWeightData(data);
                        if (reading) {
                            updateWeight(reading);
                        }
                    },
                    onStatusChange: (status: ConnectionStatus) => {
                        setState(prev => ({ ...prev, status }));
                    },
                    onError: (error: Error) => {
                        setState(prev => ({ ...prev, error: error.message, status: 'error' }));
                    }
                });
            }

            await connectionRef.current.connect();

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al conectar con la balanza';
            setState(prev => ({
                ...prev,
                error: message,
                status: 'disconnected'
            }));
        }
    }, [updateWeight]);

    /**
     * Desconectar de la balanza
     */
    const disconnect = useCallback(async () => {
        if (MOCK_MODE && mockIntervalRef.current) {
            clearInterval(mockIntervalRef.current);
            mockIntervalRef.current = null;
            setState(prev => ({ ...prev, status: 'disconnected', weight: 0, grossWeight: 0 }));
            return;
        }

        if (connectionRef.current) {
            await connectionRef.current.disconnect();
            connectionRef.current = null;
        }

        lastWeightsRef.current = [];
        setState(prev => ({
            ...prev,
            status: 'disconnected',
            weight: 0,
            grossWeight: 0,
            isStable: false
        }));
    }, []);

    /**
     * Capturar peso estable actual
     * Retorna el peso solo si está estable, de lo contrario lanza error
     */
    const captureWeight = useCallback((): number => {
        if (!state.isStable) {
            throw new Error('El peso no está estable. Espera a que se estabilice.');
        }

        const validation = validateWeight(state.weight);
        if (!validation.valid) {
            throw new Error(validation.error || 'Peso inválido');
        }

        return state.weight;
    }, [state.weight, state.isStable]);

    /**
     * Resetear peso (tarar)
     */
    const reset = useCallback(() => {
        lastWeightsRef.current = [];
        setState(prev => ({
            ...prev,
            weight: 0,
            grossWeight: 0,
            isStable: false,
            error: null
        }));
    }, []);

    /**
     * Auto-conectar al montar si está habilitado
     */
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        // Cleanup al desmontar
        return () => {
            if (mockIntervalRef.current) {
                clearInterval(mockIntervalRef.current);
            }
            // No desconectar automáticamente para permitir compartir la conexión
        };
    }, [autoConnect, connect]);

    return {
        // Estado
        ...state,

        // Funciones
        connect,
        disconnect,
        captureWeight,
        reset,

        // Utilidades
        isSupported: SerialConnection.isSupported(),
        isMockMode: MOCK_MODE
    };
}
