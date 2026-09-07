export function getApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL no está definida");
  }

  return apiUrl;
}

export function apiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiUrl()}${normalizedPath}`;
}
