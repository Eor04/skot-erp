/**
 * COMPONENTE LECTOR DE BALANZA PRIX 4
 * 
 * Interfaz visual para conectar, leer peso, y capturar lecturas estables
 */

'use client';

import { useEffect } from 'react';
import { useScale } from '@/hooks/use-scale';
import styles from './scale-reader.module.css';

export interface ScaleReaderProps {
    branchId: string;                                    // ID de sucursal (para obtener config)
    tara?: number;                                        // Peso de tara en kg
    onWeightCaptured?: (weight: number) => void;          // Callback cuando se captura peso
    onError?: (error: string) => void;                    // Callback de errores
    minWeight?: number;                                   // Peso mínimo permitido
    maxWeight?: number;                                   // Peso máximo permitido
    autoConnect?: boolean;                                // Auto-conectar al montar
}

export function ScaleReader({
    branchId,
    tara = 0.15,
    onWeightCaptured,
    onError,
    minWeight = 0.05,
    maxWeight = 5.0,
    autoConnect = false
}: ScaleReaderProps) {

    const {
        status,
        weight,
        grossWeight,
        isStable,
        error,
        connect,
        disconnect,
        captureWeight,
        isSupported,
        isMockMode
    } = useScale({ tara, autoConnect });

    // Notificar errores
    useEffect(() => {
        if (error && onError) {
            onError(error);
        }
    }, [error, onError]);

    // Manejar captura de peso
    const handleCaptureWeight = () => {
        try {
            const capturedWeight = captureWeight();

            // Validar rango
            if (capturedWeight < minWeight) {
                onError?.(`Peso mínimo: ${minWeight * 1000}g`);
                return;
            }

            if (capturedWeight > maxWeight) {
                onError?.(`Peso máximo excedido: ${maxWeight}kg`);
                return;
            }

            // Notificar peso capturado
            onWeightCaptured?.(capturedWeight);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error al capturar peso';
            onError?.(message);
        }
    };

    // Atajo de teclado F1 para capturar peso
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                if (isStable && status === 'reading') {
                    handleCaptureWeight();
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isStable, status, handleCaptureWeight]);

    // Estado de la conexión
    const getStatusDisplay = () => {
        switch (status) {
            case 'disconnected':
                return { text: 'Desconectado', color: 'gray' };
            case 'connecting':
                return { text: 'Conectando...', color: 'blue' };
            case 'connected':
            case 'reading':
                return { text: 'Conectado', color: 'green' };
            case 'error':
                return { text: 'Error', color: 'red' };
        }
    };

    const statusDisplay = getStatusDisplay();

    // Indicador de peso estable
    const stabilityIndicator = isStable ? '🟢 Estable' : '🟡 Estabilizando...';
    const weightColor = isStable ? 'green' : 'yellow';

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.statusBadge} data-status={statusDisplay.color}>
                    🔌 Estado: {statusDisplay.text}
                </div>

                {isMockMode && (
                    <div className={styles.mockBadge}>
                        ⚠️ Modo Simulación
                    </div>
                )}
            </div>

            {/* Display de Peso */}
            <div className={styles.display}>
                <div
                    className={`${styles.weight} ${isStable ? '' : styles.weighChanging}`}
                    data-weight-color={weightColor}
                >
                    {weight.toFixed(3)} kg
                </div>

                <div className={styles.stability}>
                    {status === 'reading' ? stabilityIndicator : '⚫ En espera'}
                </div>

                {/* Info adicional */}
                {grossWeight > 0 && (
                    <div className={styles.info}>
                        <span>Peso bruto: {grossWeight.toFixed(3)} kg</span>
                        <span>Tara: -{tara.toFixed(3)} kg</span>
                    </div>
                )}
            </div>

            {/* Controles */}
            <div className={styles.controls}>
                {status === 'disconnected' || status === 'error' ? (
                    <button
                        onClick={() => connect()}
                        className={`${styles.button} ${styles.buttonConnect}`}
                        disabled={!isSupported}
                    >
                        {isSupported ? 'Conectar Balanza' : 'No Soportado'}
                    </button>
                ) : (
                    <>
                        <button
                            onClick={handleCaptureWeight}
                            className={`${styles.button} ${styles.buttonCapture}`}
                            disabled={!isStable}
                            title="F1"
                        >
                            Capturar Peso (F1)
                        </button>

                        <button
                            onClick={disconnect}
                            className={`${styles.button} ${styles.buttonDisconnect}`}
                        >
                            Desconectar
                        </button>
                    </>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className={styles.error}>
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
}
