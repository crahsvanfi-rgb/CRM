import { getApiUrl } from '@/lib/api-url';
/**
 * Servicio Frontend de IntegraciÃ³n con Zernio
 * Todas las peticiones se realizan al Backend Proxy (/zernio/...), NUNCA a Zernio directamente.
 */


const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('supabase_token') || '' : '';
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') || '' : '';
  const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') || '' : '';

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
    ...(userId ? { 'x-user-id': userId } : {}),
  };
};

export interface SendMessageResponse {
  success: boolean;
  messageId: string;
  conversationId: string;
  externalMessageId?: string;
  status: string;
}

export interface PublishContentResponse {
  success: boolean;
  published: boolean;
  postId: string;
  plataformas: string[];
}

export interface ZernioConfigData {
  id?: string;
  canal: string;
  habilitado: boolean;
  apiKey: string;
  phone_number_id?: string;
  verify_token?: string;
  status: 'CONECTADO' | 'ERROR' | 'DESACTIVADO' | 'SIN_CONFIGURAR';
  message?: string;
}

/**
 * EnvÃ­a un mensaje de WhatsApp a travÃ©s del backend proxy de Zernio
 * @param telefono NÃºmero de telÃ©fono en formato internacional (ej: +59171234567)
 * @param mensaje Contenido del mensaje de texto
 * @param mediaUrl URL opcional de imagen o multimedia
 */
export async function enviarMensajeWhatsApp(
  telefono: string,
  mensaje: string,
  mediaUrl?: string,
): Promise<SendMessageResponse> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/zernio/send`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      telefono,
      mensaje,
      mediaUrl,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error enviando mensaje WhatsApp' }));
    throw new Error(errorData.message || `Error ${response.status}: No se pudo enviar el mensaje`);
  }

  return response.json();
}

/**
 * Publica contenido en mÃºltiples plataformas de redes sociales vÃ­a Zernio
 * @param plataformas Array de nombres de plataforma (ej: ['whatsapp', 'facebook', 'instagram'])
 * @param texto Texto de la publicaciÃ³n
 * @param mediaUrl URL opcional de multimedia adjunto
 */
export async function publicarContenido(
  plataformas: string[],
  texto: string,
  mediaUrl?: string,
): Promise<PublishContentResponse> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/zernio/publicar`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      plataformas,
      texto,
      mediaUrl,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error publicando contenido' }));
    throw new Error(errorData.message || `Error ${response.status}: No se pudo publicar el contenido`);
  }

  return response.json();
}

/**
 * Obtiene la configuraciÃ³n actual de Zernio del tenant activo
 */
export async function getZernioConfig(): Promise<ZernioConfigData> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/zernio/config`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: No se pudo obtener la configuraciÃ³n de Zernio`);
  }

  return response.json();
}

/**
 * Guarda o actualiza la configuraciÃ³n de Zernio para el tenant
 */
export async function saveZernioConfig(config: {
  apiKey?: string;
  habilitado: boolean;
  phone_number_id?: string;
  webhookSecret?: string;
}): Promise<{ success: boolean; id: string; habilitado: boolean; status: string }> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/zernio/config`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error guardando configuraciÃ³n' }));
    throw new Error(errorData.message || `Error ${response.status}: No se pudo guardar la configuraciÃ³n`);
  }

  return response.json();
}

/**
 * Realiza un test de conexiÃ³n contra Zernio a travÃ©s del backend
 */
export async function testZernioConnection(apiKey?: string): Promise<{ status: 'CONECTADO' | 'ERROR' | 'SIN_CONFIGURAR'; message: string }> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/zernio/test-connection`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ apiKey }),
  });

  if (!response.ok) {
    return {
      status: 'ERROR',
      message: 'Fallo al contactar el servicio de verificaciÃ³n de Zernio',
    };
  }

  return response.json();
}

