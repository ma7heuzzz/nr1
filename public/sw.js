// public/sw.js - Service Worker without any caching

self.addEventListener("install", (event) => {
  console.log("Service Worker: Installed (no caching)");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activated (no caching)");
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Simply bypass and allow default browser fetch behavior
  // Useful for live apps where latest version is always needed
  return;
});
