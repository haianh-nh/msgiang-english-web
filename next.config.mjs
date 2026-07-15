/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    cpus: 2
  },
  async headers() {
    return [
      {
        source: "/v15/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
        ]
      },
      {
        source: "/index-v15.html",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Msgiang-Build", value: "20phase8-student-transfer-schedule-attendance" }
        ]
      },
      {
        source: "/deployment-version.json",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Msgiang-Build", value: "20phase8-student-transfer-schedule-attendance" }
        ]
      }
    ];
  }
};

export default nextConfig;
