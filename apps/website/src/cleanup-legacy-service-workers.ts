async function clearServiceWorkerCaches() {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
}

export async function cleanupLegacyServiceWorkers() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const origin = window.location.origin;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const websiteRegistrations = registrations.filter((registration) =>
    registration.scope.startsWith(origin)
  );

  if (websiteRegistrations.length === 0) {
    return;
  }

  await Promise.all(websiteRegistrations.map((registration) => registration.unregister()));
  await clearServiceWorkerCaches();
}
