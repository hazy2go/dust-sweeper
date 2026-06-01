/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The SODAX SDK + wallet adapters pull in many large optional chain libs.
  // Keep them server-external where possible and transpile the workspace packages.
  transpilePackages: ['@sodax/sdk', '@sodax/wallet-sdk-react', '@sodax/dapp-kit'],
  webpack: (config) => {
    // Some chain SDKs reference node core modules that aren't needed in the browser.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
