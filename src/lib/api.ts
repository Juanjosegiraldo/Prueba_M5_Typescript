// Shared API helper for automatic access-token refresh

export const fetchWithRefresh = async (url: string, options: RequestInit = {}) => {
  let response = await fetch(url, options);

  // If the server returns 401, try refreshing the access token once.
  if (response.status === 401) {
    console.log("Access token expired, trying refresh...");

    const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });

    if (refreshRes.ok) {
      // Retry the original request after a successful refresh.
      response = await fetch(url, options);
    } else {
      // Safety brake: only redirect if we're not already on login.
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login?error=session_expired';
      }
    }
  }

  return response;
};
