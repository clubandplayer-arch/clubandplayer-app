/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Non fallire il build in produzione se ci sono errori ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
