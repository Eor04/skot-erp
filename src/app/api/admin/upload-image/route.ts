import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

/**
 * POST /api/admin/upload-image
 * Sube una imagen a Cloudinary desde el servidor usando el SDK oficial.
 * Espera un FormData con campo "file" (imagen).
 */

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No se recibió ningún archivo' }, { status: 400 });
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ success: false, error: 'Solo se permiten imágenes (jpg, png, webp)' }, { status: 400 });
        }

        // Convertir file a buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Subir a Cloudinary via stream
        const result: any = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: 'skot/products',
                    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(buffer);
        });

        return NextResponse.json({
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
        });
    } catch (error: any) {
        console.error('Error upload imagen:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al subir la imagen',
        }, { status: 500 });
    }
}
