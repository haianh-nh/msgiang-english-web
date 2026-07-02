/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/", destination: "/index-v48-port.html" }
    ];
  }
};

export default nextConfig;
