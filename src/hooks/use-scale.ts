/**
 * HOOK REACT PARA INTEGRACIÓN CON BALANZA PRIX 4
 *
 * Modos soportados:
 *   'serial'  — Web Serial API (USB, Chrome/Edge)
 *   'network' — WebSocket local → bridge TCP/IP (scale-bridge/bridge.js)
 *   'mock'    — Simulación para desarrollo (NEXT_PUBLIC_MOCK_SCALE=true)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SerialConnection, ConnectionStatus } from '@/lib/scale/serial-connection';
import { parseWeightData, isWeightStable, validateWeight, WeightReading } from '@/lib/scale/prix4-protocol';

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_SCALE === 'true';
const DEFAULT_WS_URL = 'ws://localhost:8765';

export type ScaleMode = 'serial' | 'network';

export interface UseScaleOptions {
    tara?:               number;   // Peso de tara en kg (se resta automáticamente)
    autoConnect?:        boolean;  // Conectar al montar
    stabilityThreshold?: number;   // Umbral de estabilidad en kg
    stabilityReadings?:  number;   // Lecturas consecutivas estables requeridas
    mode?:               ScaleMode;
    wsUrl?:              string;   // URL del bridge WebSocket (default: ws://localhost:8765)
}

export interface UseScaleState {
    status:      ConnectionStatus;
    weight:      number;
    grossWeight: number;
    isStable:    boolean;
    error:       string | null;
    lastReading: WeightReading | null;
    mode:        ScaleMode;
}

export function useScale(options: UseScaleOptions = {}) {
    const {
        tara               = 0,
        autoConnect        = false,
        stabilityThreshold = 0.005,
        stabilityReadings  = 3,
        mode: initialMode  = 'serial',
        wsUrl              = DEFAULT_WS_URL,
    } = options;

    const [mode, setMode] = useState<ScaleMode>(initialMode);
    const [state, setState] = useState<UseScaleState>({
        status:      'disconnected',
        weight:      0,
        grossWeight: 0,
        isStable:    false,
        error:       null,
        lastReading: null,
        mode:        initialMode,
    });

    const connectionRef    = useRef<SerialConnection | null>(null);
    const wsRef            = useRef<WebSocket | null>(null);
    const lastWeightsRef   = useRef<number[]>([]);
    const mockIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Procesar una lectura de peso (común a todos los modos) ──────────────
    const updateWeight = useCallback((reading: WeightReading) => {
        const gross  = reading.weight;
        const net    = Math.max(0, gross - tara);

        lastWeightsRef.current = [...lastWeightsRef.current, gross].slice(-stabilityReadings);

        const stable = lastWeightsRef.current.length >= stabilityReadings &&
            lastWeightsRef.current.every((w, i, a) =>
                i === 0 || isWeightStable(w, a[i - 1], stabilityThreshold)
            );

        const validation = validateWeight(net);
        setState(prev => ({
            ...prev,
            weight:      net,
            grossWeight: gross,
            isStable:    stable || reading.stable === true,
            error:       validation.valid ? null : (validation.error ?? null),
            lastReading: reading,
        }));
    }, [tara, stabilityThreshold, stabilityReadings]);

    // ── MOCK ────────────────────────────────────────────────────────────────
    const connectMock = useCallback(() => {
        setState(prev => ({ ...prev, status: 'connected', mode: 'serial' }));
        mockIntervalRef.current = setInterval(() => {
            updateWeight({
                weight: 0.5 + Math.random() * 1.5,
                unit:   'kg',
                stable: Math.random() > 0.3,
                raw:    'MOCK',
            });
        }, 500);
    }, [updateWeight]);

    // ── MODO NETWORK (WebSocket → bridge TCP) ───────────────────────────────
    const connectNetwork = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        setState(prev => ({ ...prev, status: 'connecting', error: null, mode: 'network' }));

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setState(prev => ({ ...prev, status: 'connected' }));
        };

        ws.onmessage = (ev) => {
            try {
                const msg = JSON.parse(ev.data);

                if (msg.type === 'weight') {
                    updateWeight({
                        weight: msg.weight,
                        unit:   msg.unit ?? 'kg',
                        stable: msg.stable ?? true,
                        raw:    msg.raw   ?? '',
                    });
                } else if (msg.type === 'status') {
                    if (!msg.connected) {
                        setState(prev => ({
                            ...prev,
                            status: 'connecting',
                            error:  msg.message ?? null,
                        }));
                    } else {
                        setState(prev => ({ ...prev, status: 'connected', error: null }));
                    }
                } else if (msg.type === 'error') {
                    setState(prev => ({ ...prev, error: msg.message, status: 'error' }));
                }
            } catch { /* ignorar mensajes mal formados */ }
        };

        ws.onerror = () => {
            setState(prev => ({
                ...prev,
                status: 'error',
                error:  `No se pudo conectar al bridge (${wsUrl}). ¿Está corriendo scale-bridge/bridge.js?`,
            }));
        };

        ws.onclose = () => {
            setState(prev => ({
                ...prev,
                status: 'disconnected',
                weight: 0,
                grossWeight: 0,
            }));
            wsRef.current = null;
        };
    }, [wsUrl, updateWeight]);

    const disconnectNetwork = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        lastWeightsRef.current = [];
        setState(prev => ({
            ...prev,
            status:      'disconnected',
            weight:      0,
            grossWeight: 0,
            isStable:    false,
        }));
    }, []);

    // ── MODO SERIAL (Web Serial API) ────────────────────────────────────────
    const connectSerial = useCallback(async () => {
        setState(prev => ({ ...prev, status: 'connecting', error: null, mode: 'serial' }));
        try {
            if (!connectionRef.current) {
                connectionRef.current = new SerialConnection({
                    onData: (data: ArrayBuffer) => {
                        const reading = parseWeightData(data);
                        if (reading) updateWeight(reading);
                    },
                    onStatusChange: (status: ConnectionStatus) => {
                        setState(prev => ({ ...prev, status }));
                    },
                    onError: (error: Error) => {
                        setState(prev => ({ ...prev, error: error.message, status: 'error' }));
                    },
                });
            }
            await connectionRef.current.connect();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al conectar con la balanza';
            setState(prev => ({ ...prev, error: message, status: 'disconnected' }));
        }
    }, [updateWeight]);

    const disconnectSerial = useCallback(async () => {
        if (connectionRef.current) {
            await connectionRef.current.disconnect();
            connectionRef.current = null;
        }
        lastWeightsRef.current = [];
        setState(prev => ({
            ...prev,
            status:      'disconnected',
            weight:      0,
            grossWeight: 0,
            isStable:    false,
        }));
    }, []);

    // ── API pública ─────────────────────────────────────────────────────────
    const connect = useCallback(async (connectMode?: ScaleMode) => {
        const m = connectMode ?? mode;
        setMode(m);
        if (MOCK_MODE) { connectMock(); return; }
        if (m === 'network') connectNetwork();
        else await connectSerial();
    }, [mode, connectMock, connectNetwork, connectSerial]);

    const disconnect = useCallback(async () => {
        if (MOCK_MODE && mockIntervalRef.current) {
            clearInterval(mockIntervalRef.current);
            mockIntervalRef.current = null;
            setState(prev => ({ ...prev, status: 'disconnected', weight: 0, grossWeight: 0 }));
            return;
        }
        if (mode === 'network') disconnectNetwork();
        else await disconnectSerial();
    }, [mode, disconnectNetwork, disconnectSerial]);

    const captureWeight = useCallback((): number => {
        if (!state.isStable) throw new Error('El peso no está estable. Esperá a que se estabilice.');
        const validation = validateWeight(state.weight);
        if (!validation.valid) throw new Error(validation.error ?? 'Peso inválido');
        return state.weight;
    }, [state.weight, state.isStable]);

    const reset = useCallback(() => {
        lastWeightsRef.current = [];
        setState(prev => ({ ...prev, weight: 0, grossWeight: 0, isStable: false, error: null }));
    }, []);

    // Auto-connect
    useEffect(() => {
        if (autoConnect) connect();
        return () => {
            if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        ...state,
        mode,
        connect,
        disconnect,
        captureWeight,
        reset,
        isSupported: SerialConnection.isSupported(),
        isMockMode:  MOCK_MODE,
    };
}
