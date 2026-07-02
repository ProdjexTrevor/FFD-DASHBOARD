const apiProxyUrl = process.env.API_PROXY_URL?.replace(/\/$/, "");

const noStoreHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "Pragma", value: "no-cache" },
];

const rewrites = apiProxyUrl
  ? [
      { source: "/api/:path*", destination: `${apiProxyUrl}/api/:path*` },
      { source: "/health", destination: `${apiProxyUrl}/health` },
      { source: "/health/db", destination: `${apiProxyUrl}/health/db` },
      { source: "/((?!assets/|api/).*)", destination: "/index.html" },
    ]
  : [{ source: "/((?!assets/|api/).*)", destination: "/index.html" }];

export const config = {
  installCommand: "npm install && npm install --include=dev --prefix client",
  buildCommand: "npm run build",
  outputDirectory: "client/dist",
  headers: [
    {
      source: "/api/(.*)",
      headers: noStoreHeaders,
    },
    {
      source: "/health",
      headers: noStoreHeaders,
    },
  ],
  rewrites,
};
