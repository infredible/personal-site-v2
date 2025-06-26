import type { NextConfig } from "next";
import createMDX from '@next/mdx'

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  
  // Performance optimizations
  experimental: {
    // optimizeCss: true, // Disabled due to critters dependency issue
    optimizePackageImports: ['lucide-react', 'framer-motion'], // Tree shake these packages
    webVitalsAttribution: ['CLS', 'LCP'], // Track Core Web Vitals
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'], // Use modern image formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // Cache images for 24 hours
  },
  
  // Enable compression
  compress: true,
  
  // Bundle analyzer in development
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config: any) => {
      // Enable bundle analyzer in dev mode
      if (process.env.ANALYZE) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'server',
            openAnalyzer: true,
          })
        );
      }
      return config;
    },
  }),
  
  // Headers for performance
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // Cache fonts for 1 year
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // Cache icons for 1 year
          },
        ],
      },
      {
        source: '/projects/:path*.(mp4|webm)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400', // Cache videos for 1 day
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX({
  // Add markdown plugins here, as desired
})

export default withMDX(nextConfig);
