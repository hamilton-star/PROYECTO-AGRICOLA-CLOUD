const COMPRADORES_URL = process.env.COMPRADORES_URL || 'http://compradores-app:3001';
const PRODUCTOS_URL = process.env.PRODUCTOS_URL || 'http://productos-app:3002';
const NOTIFICACIONES_URL = process.env.NOTIFICACIONES_URL || 'http://notificaciones-app:3006';

const TIMEOUT_MS = 5000;

async function fetchConTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function obtenerComprador(compradorId) {
  try {
    const res = await fetchConTimeout(`${COMPRADORES_URL}/compradores/${compradorId}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Error ${res.status} al consultar servicio de compradores`);
    }
    return await res.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al conectar con el servicio de compradores');
    }
    throw error;
  }
}

async function obtenerProducto(productoId) {
  try {
    const res = await fetchConTimeout(`${PRODUCTOS_URL}/productos/${productoId}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Error ${res.status} al consultar servicio de productos`);
    }
    return await res.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al conectar con el servicio de productos');
    }
    throw error;
  }
}

async function actualizarStockProducto(productoId, nuevoStock, productoCompleto) {
  try {
    const body = {
      nombre: productoCompleto.nombre,
      categoria: productoCompleto.categoria,
      descripcion: productoCompleto.descripcion,
      precio: productoCompleto.precio,
      unidad_medida: productoCompleto.unidad_medida,
      stock_disponible: nuevoStock,
      provincia_origen: productoCompleto.provincia_origen,
      temporada_cosecha: productoCompleto.temporada_cosecha,
      activo: productoCompleto.activo
    };

    const res = await fetchConTimeout(`${PRODUCTOS_URL}/productos/${productoId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.warn(`[WARN] No se pudo actualizar stock del producto ${productoId}. Status: ${res.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(`[WARN] Error de comunicación al actualizar stock del producto ${productoId}:`, error.message);
    return false;
  }
}

async function emitirEventoNotificacion(evento) {
  try {
    const res = await fetchConTimeout(`${NOTIFICACIONES_URL}/notificaciones/eventos`, {
      method: 'POST',
      body: JSON.stringify(evento)
    });

    if (!res.ok) {
      console.warn(`[WARN] Notificaciones respondió con status ${res.status}`);
      return false;
    }
    return await res.json();
  } catch (error) {
    console.warn('[WARN] No se pudo conectar con el microservicio de Notificaciones:', error.message);
    return false; // La falla en notificaciones no debe abortar la operación principal
  }
}

module.exports = {
  obtenerComprador,
  obtenerProducto,
  actualizarStockProducto,
  emitirEventoNotificacion,
  COMPRADORES_URL,
  PRODUCTOS_URL,
  NOTIFICACIONES_URL
};
