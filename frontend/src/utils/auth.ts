// Utility to guarantee valid multi-tenant and user credentials across all API requests

export const DEFAULT_TENANT_ID = 'cc5c04c1-5e60-4c54-bacb-6003cbb9cde5';
export const DEFAULT_USER_ID = 'f5843083-153b-4ef3-bded-cd9c6cf40c95';

export function getAuthCredentials() {
  if (typeof window === 'undefined') {
    return {
      tenantId: DEFAULT_TENANT_ID,
      userId: DEFAULT_USER_ID,
      token: '',
      role: 'Admin',
    };
  }

  // Ensure localStorage is initialized with valid database tenant/user IDs
  // Esta instalación trabaja con un único tenant; evita reutilizar un tenant antiguo del navegador.
  let tenantId = DEFAULT_TENANT_ID;
  if (localStorage.getItem('tenant_id') !== DEFAULT_TENANT_ID || localStorage.getItem('tenantId') !== DEFAULT_TENANT_ID) {
    localStorage.setItem('tenant_id', DEFAULT_TENANT_ID);
    localStorage.setItem('tenantId', DEFAULT_TENANT_ID);
  }

  let userId = localStorage.getItem('user_id') || localStorage.getItem('userId');
  if (!userId || userId === '12345678-1234-1234-1234-123456789012' || userId === '00000000-0000-0000-0000-000000000000' || userId === '671fbb0f-afb2-472c-82f8-5c9be494ad29') {
    userId = DEFAULT_USER_ID;
    localStorage.setItem('user_id', DEFAULT_USER_ID);
    localStorage.setItem('userId', DEFAULT_USER_ID);
  }

  const token = localStorage.getItem('token') || localStorage.getItem('supabase_token') || '';

  return {
    tenantId,
    userId,
    token,
    role: 'Admin',
  };
}

export function getAuthHeaders(): Record<string, string> {
  const { tenantId, userId, token, role } = getAuthCredentials();
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    'x-user-id': userId,
    'x-role': role,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}
