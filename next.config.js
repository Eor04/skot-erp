/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,

    // Dominios permitidos para next/image
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
                port: '',
                pathname: '/**',
            },
        ],
    },

    // Prisma optimization for serverless
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals.push('_http_common');
        }
        return config;
    },
};

module.exports = nextConfig;
