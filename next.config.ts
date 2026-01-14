import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Configurações de segurança e performance
  poweredByHeader: false,

  // Headers de segurança e Client Hints
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Client Hints para melhor detecção de dispositivo
          {
            key: 'Accept-CH',
            value: 'Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version-List',
          },
          // HSTS - força HTTPS em produção
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ]
  },
}

export default nextConfig
