/**
 * Configuración de Cloudinary para upload de imágenes
 */

export const cloudinaryConfig = {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'skot-products',
    folder: 'skot/products',
};

/**
 * Generar URL firmada para upload
 * @param timestamp Timestamp actual en ms
 * @param publicId ID público personalizado (opcional)
 */
export function generateSignature(timestamp: number, publicId?: string) {
    const crypto = require('crypto');
    const params: Record<string, any> = {
        timestamp,
        upload_preset: cloudinaryConfig.uploadPreset,
        folder: cloudinaryConfig.folder,
    };

    if (publicId) {
        params.public_id = publicId;
    }

    // Ordenar parámetros alfabéticamente
    const sortedParams = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&');

    // Generar firma SHA256
    const signature = crypto
        .createHash('sha256')
        .update(sortedParams + cloudinaryConfig.apiSecret)
        .digest('hex');

    return { signature, timestamp, ...params };
}

/**
 * Generar URL de imagen optimizada de Cloudinary
 * @param publicId ID público de la imagen
 * @param transformations Transformaciones opcionales
 */
export function getOptimizedImageUrl(
    publicId: string,
    transformations?: {
        width?: number;
        height?: number;
        crop?: 'fill' | 'fit' | 'scale' | 'thumb';
        quality?: 'auto' | number;
        format?: 'auto' | 'webp' | 'jpg' | 'png';
    }
): string {
    const { width, height, crop = 'fill', quality = 'auto', format = 'auto' } = transformations || {};

    let transformString = `f_${format},q_${quality}`;

    if (width && height) {
        transformString += `,w_${width},h_${height},c_${crop}`;
    } else if (width) {
        transformString += `,w_${width}`;
    } else if (height) {
        transformString += `,h_${height}`;
    }

    return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/${transformString}/${publicId}`;
}

/**
 * Extraer public_id de una URL de Cloudinary
 */
export function extractPublicId(imageUrl: string): string | null {
    // Formato: https://res.cloudinary.com/cloud_name/image/upload/v123456789/folder/filename.jpg
    const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return null;

    // Remover extensión
    return match[1].replace(/\.[^.]+$/, '');
}
