const apiProxyUrl = process.env.API_PROXY_URL?.replace(/\/$/, "");

const rewrites = apiProxyUrl
  ? [
      { source: "/api/:path*", destination: `${apiProxyUrl}/api/:path*` },
      { source: "/health", destination: `${apiProxyUrl}/health` },
      { source: "/health/db", destination: `${apiProxyUrl}/health/db` },
      { source: "/((?!assets/|api/).*)", destination: "/index.html" },
    ]
  : [
      { source: "/api/:path*", destination: "/api/unconfigured" },
      { source: "/health", destination: "/api/unconfigured" },
      { source: "/((?!assets/|api/).*)", destination: "/index.html" },
    ];

export const config = {
  installCommand: "npm install && npm install --include=dev --prefix client",
  buildCommand: "npm run build",
  outputDirectory: "client/dist",
  rewrites,
};
