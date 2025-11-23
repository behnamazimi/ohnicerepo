// Create JSON response helper
export function jsonResponse(data: any, status: number = 200, headers?: Headers): Response {
  const responseHeaders = headers || new Headers();
  responseHeaders.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders,
  });
}

// Simple hash function for deduplication keys
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

