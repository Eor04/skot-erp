/**
 * PROTOCOLO PRIX 4 - BALANZA DIGITAL
 * 
 * Configuración estándar:
 * - Baud Rate: 9600 bps
 * - Data Bits: 8
 * - Parity: None
 * - Stop Bits: 1
 * - Flow Control: None
 */

// Configuración del puerto serial para Prix 4
export const PRIX4_CONFIG = {
    baudRate: 9600,
    dataBits: 8 as const,
    stopBits: 1 as const,
    parity: 'none' as const,
    bufferSize: 1024,
    flowControl: 'none' as const
};

// Tipos de datos de lectura
export interface WeightReading {
    weight: number;        // Peso en kg
    unit: string;          // Unidad (kg, g, lb, etc.)
    stable: boolean;       // ¿Peso estabilizado?
    raw: string;           // Datos crudos recibidos
}

// Umbral para considerar peso estable (en kg)
const STABILITY_THRESHOLD = 0.005; // 5 gramos

// Validación de rangos
export const WEIGHT_LIMITS = {
    MIN: 0.005,  // 5 gramos mínimo
    MAX: 5.0     // 5 kg máximo (ajustar según tu balanza)
};

/**
 * Parser de datos del protocolo Prix 4
 * 
 * Formatos esperados (varía según configuración de la balanza):
 * - "W   1.234 kg\r\n"
 * - "   1.234\r\n"
 * - "ST   1.234 kg\r\n"  (ST = stable)
 * 
 * @param buffer Buffer de datos recibidos del puerto serial
 * @returns Lectura de peso parseada o null si no es válida
 */
export function parseWeightData(buffer: ArrayBuffer): WeightReading | null {
    try {
        // Convertir ArrayBuffer a string
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(buffer).trim();

        if (!text || text.length === 0) {
            return null;
        }

        // Detectar si es peso estable (algunas balanzas envían "ST" o indicador similar)
        const isStableMarked = text.includes('ST') || text.includes('STABLE');

        // Extraer el número del peso usando regex
        // Soporta formatos: "1.234", "  1.234  ", "W 1.234 kg", etc.
        const weightMatch = text.match(/(-?\d+\.?\d*)/);

        if (!weightMatch) {
            console.warn('Prix4: No se pudo extraer peso del texto:', text);
            return null;
        }

        const weightValue = parseFloat(weightMatch[1]);

        if (isNaN(weightValue)) {
            console.warn('Prix4: Valor de peso no numérico:', weightMatch[1]);
            return null;
        }

        // Detectar unidad (kg, g, lb, oz)
        let unit = 'kg'; // Por defecto kg
        const upperText = text.toUpperCase();

        if (upperText.includes('G') && !upperText.includes('KG')) {
            unit = 'g';
        } else if (upperText.includes('LB')) {
            unit = 'lb';
        } else if (upperText.includes('OZ')) {
            unit = 'oz';
        }

        // Convertir todo a kg para estandarizar
        let weightInKg = weightValue;

        if (unit === 'g') {
            weightInKg = weightValue / 1000;
        } else if (unit === 'lb') {
            weightInKg = weightValue * 0.453592;
        } else if (unit === 'oz') {
            weightInKg = weightValue * 0.0283495;
        }

        return {
            weight: weightInKg,
            unit: 'kg', // Siempre retornamos en kg
            stable: isStableMarked,
            raw: text
        };

    } catch (error) {
        console.error('Prix4: Error al parsear datos:', error);
        return null;
    }
}

/**
 * Determina si el peso está estable comparando lecturas consecutivas
 * 
 * @param currentWeight Peso actual en kg
 * @param previousWeight Peso anterior en kg
 * @param threshold Umbral de variación en kg (default: 5g)
 * @returns true si la diferencia está dentro del umbral
 */
export function isWeightStable(
    currentWeight: number,
    previousWeight: number,
    threshold: number = STABILITY_THRESHOLD
): boolean {
    const difference = Math.abs(currentWeight - previousWeight);
    return difference <= threshold;
}

/**
 * Valida si el peso está dentro de los rangos permitidos
 * 
 * @param weight Peso en kg
 * @param minWeight Peso mínimo permitido (default: 5g)
 * @param maxWeight Peso máximo permitido (default: 5kg)
 * @returns Objeto con validación y mensaje de error si aplica
 */
export function validateWeight(
    weight: number,
    minWeight: number = WEIGHT_LIMITS.MIN,
    maxWeight: number = WEIGHT_LIMITS.MAX
): { valid: boolean; error?: string } {

    if (weight < 0) {
        return {
            valid: false,
            error: 'Peso negativo detectado. Verifica la tara de la balanza.'
        };
    }

    if (weight < minWeight) {
        return {
            valid: false,
            error: `Peso mínimo: ${minWeight * 1000}g`
        };
    }

    if (weight > maxWeight) {
        return {
            valid: false,
            error: `Peso máximo excedido: ${maxWeight}kg`
        };
    }

    return { valid: true };
}

/**
 * Formatea peso para visualización
 * 
 * @param weight Peso en kg
 * @param decimals Número de decimales (default: 3)
 * @returns String formateado "X.XXX kg"
 */
export function formatWeight(weight: number, decimals: number = 3): string {
    return `${weight.toFixed(decimals)} kg`;
}
