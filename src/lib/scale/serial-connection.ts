/**
 * CONEXIÓN SERIAL CON BALANZA PRIX 4
 * Usa Web Serial API (Chrome/Edge 89+)
 * 
 * Documentación: https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
 */

import { PRIX4_CONFIG } from './prix4-protocol';

export type ConnectionStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reading'
    | 'error';

export interface SerialConnectionOptions {
    baudRate?: number;
    onData?: (data: ArrayBuffer) => void;
    onStatusChange?: (status: ConnectionStatus) => void;
    onError?: (error: Error) => void;
}

/**
 * Clase para manejar la conexión con la balanza vía Web Serial API
 */
export class SerialConnection {
    private port: SerialPort | null = null;
    private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    private readingLoop: boolean = false;
    private status: ConnectionStatus = 'disconnected';

    private options: SerialConnectionOptions;

    constructor(options: SerialConnectionOptions = {}) {
        this.options = {
            baudRate: options.baudRate || PRIX4_CONFIG.baudRate,
            onData: options.onData || (() => { }),
            onStatusChange: options.onStatusChange || (() => { }),
            onError: options.onError || ((err) => console.error('Serial Error:', err))
        };
    }

    /**
     * Verifica si Web Serial API está disponible en el navegador
     */
    static isSupported(): boolean {
        return 'serial' in navigator;
    }

    /**
     * Solicita al usuario seleccionar un puerto y se conecta
     * 
     * @param port Puerto serial opcional (si ya se tiene permiso)
     * @returns Promise que se resuelve cuando la conexión es exitosa
     */
    async connect(port?: SerialPort): Promise<void> {
        try {
            this.setStatus('connecting');

            // Si no se proporciona un puerto, solicitar uno al usuario
            if (!port) {
                if (!SerialConnection.isSupported()) {
                    throw new Error(
                        'Web Serial API no está disponible. ' +
                        'Usa Chrome/Edge 89+ o implementa un backend proxy.'
                    );
                }

                try {
                    this.port = await navigator.serial.requestPort();
                } catch (err) {
                    // Usuario canceló la selección de puerto
                    this.setStatus('disconnected');
                    throw new Error('Selección de puerto cancelada por el usuario');
                }
            } else {
                this.port = port;
            }

            // Abrir el puerto con la configuración Prix 4
            await this.port.open({
                baudRate: this.options.baudRate,
                dataBits: PRIX4_CONFIG.dataBits,
                stopBits: PRIX4_CONFIG.stopBits,
                parity: PRIX4_CONFIG.parity,
                flowControl: PRIX4_CONFIG.flowControl
            });

            this.setStatus('connected');

            // Iniciar lectura automática
            this.startReading();

        } catch (error) {
            this.setStatus('error');
            const err = error instanceof Error ? error : new Error(String(error));
            this.options.onError?.(err);
            throw err;
        }
    }

    /**
     * Desconecta y cierra el puerto serial
     */
    async disconnect(): Promise<void> {
        try {
            // Detener la lectura
            await this.stopReading();

            // Cerrar el puerto
            if (this.port && this.port.readable) {
                await this.port.close();
            }

            this.port = null;
            this.setStatus('disconnected');

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.options.onError?.(err);
            this.setStatus('error');
        }
    }

    /**
     * Inicia el loop de lectura continua de datos
     */
    async startReading(): Promise<void> {
        if (!this.port || !this.port.readable) {
            throw new Error('Puerto no conectado o no legible');
        }

        if (this.readingLoop) {
            console.warn('Lectura ya en progreso');
            return;
        }

        this.readingLoop = true;
        this.setStatus('reading');

        try {
            this.reader = this.port.readable.getReader();

            while (this.readingLoop) {
                const { value, done } = await this.reader.read();

                if (done) {
                    // El stream se cerró
                    break;
                }

                if (value) {
                    // Emitir datos recibidos
                    this.options.onData?.(value.buffer);
                }
            }

        } catch (error) {
            if (this.readingLoop) {
                // Solo considerar error si no detuvimos intencionalmente
                const err = error instanceof Error ? error : new Error(String(error));
                this.options.onError?.(err);
                this.setStatus('error');
            }
        } finally {
            // Liberar el reader
            if (this.reader) {
                this.reader.releaseLock();
                this.reader = null;
            }
        }
    }

    /**
     * Detiene el loop de lectura
     */
    async stopReading(): Promise<void> {
        this.readingLoop = false;

        if (this.reader) {
            try {
                await this.reader.cancel();
                this.reader.releaseLock();
            } catch (error) {
                // Ignorar errores al cancelar
                console.warn('Error al cancelar reader:', error);
            }
            this.reader = null;
        }

        if (this.status === 'reading') {
            this.setStatus('connected');
        }
    }

    /**
     * Verifica si el puerto está conectado
     */
    isConnected(): boolean {
        return this.status === 'connected' || this.status === 'reading';
    }

    /**
     * Obtiene el estado actual de la conexión
     */
    getStatus(): ConnectionStatus {
        return this.status;
    }

    /**
     * Lista puertos seriales disponibles (requiere que el usuario haya dado permiso previamente)
     */
    static async getAvailablePorts(): Promise<SerialPort[]> {
        if (!SerialConnection.isSupported()) {
            return [];
        }

        try {
            return await navigator.serial.getPorts();
        } catch (error) {
            console.error('Error al obtener puertos:', error);
            return [];
        }
    }

    /**
     * Actualiza el estado y notifica a listeners
     */
    private setStatus(status: ConnectionStatus): void {
        this.status = status;
        this.options.onStatusChange?.(status);
    }
}

/**
 * Singleton para la conexión con la balanza
 * Útil para compartir la misma conexión en toda la app
 */
export class ScaleConnectionManager {
    private static instance: SerialConnection | null = null;

    static getInstance(options?: SerialConnectionOptions): SerialConnection {
        if (!ScaleConnectionManager.instance) {
            ScaleConnectionManager.instance = new SerialConnection(options);
        }
        return ScaleConnectionManager.instance;
    }

    static resetInstance(): void {
        if (ScaleConnectionManager.instance) {
            ScaleConnectionManager.instance.disconnect();
            ScaleConnectionManager.instance = null;
        }
    }
}
