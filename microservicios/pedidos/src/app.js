const express = require('express');
const pool = require('./db');
const {
  obtenerComprador,
  obtenerProducto,
  actualizarStockProducto,
  emitirEventoNotificacion
} = require('./services/httpClient');

const app = express();
app.use(express.json());

// Transiciones válidas en la máquina de estados del pedido
const TRANSICIONES_VALIDAS = {
  PENDIENTE: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['EN_PREPARACION', 'CANCELADO'],
  EN_PREPARACION: ['EN_CAMINO'],
  EN_CAMINO: ['ENTREGADO'],
  ENTREGADO: [],
  CANCELADO: []
};

// Chequeo de salud
app.get('/health', (req, res) => {
  res.json({ estado: 'ok', servicio: 'pedidos' });
});

// Listar pedidos con filtros opcionales
app.get('/pedidos', async (req, res) => {
  const { comprador_id, productor_id, estado } = req.query;
  try {
    let query = 'SELECT * FROM pedidos WHERE 1=1';
    const params = [];

    if (comprador_id) {
      params.push(comprador_id);
      query += ` AND comprador_id = $${params.length}`;
    }
    if (productor_id) {
      params.push(productor_id);
      query += ` AND productor_id = $${params.length}`;
    }
    if (estado) {
      params.push(estado.toUpperCase());
      query += ` AND UPPER(estado) = $${params.length}`;
    }

    query += ' ORDER BY creado_en DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar pedidos:', error);
    res.status(500).json({ error: 'Error al consultar lista de pedidos' });
  }
});

// Detalle de un pedido por ID con sus ítems e historial
app.get('/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pedidoResult = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);
    if (pedidoResult.rowCount === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const itemsResult = await pool.query('SELECT * FROM pedidos_items WHERE pedido_id = $1', [id]);
    const historialResult = await pool.query(
      'SELECT * FROM pedidos_historial_estados WHERE pedido_id = $1 ORDER BY fecha ASC',
      [id]
    );

    const pedido = pedidoResult.rows[0];
    pedido.items = itemsResult.rows;
    pedido.historial = historialResult.rows;

    res.json(pedido);
  } catch (error) {
    console.error('Error al obtener detalle de pedido:', error);
    res.status(500).json({ error: 'Error al obtener detalle del pedido' });
  }
});

// Consultar únicamente el historial de cambios de estado
app.get('/pedidos/:id/historial', async (req, res) => {
  const { id } = req.params;
  try {
    const pedidoExiste = await pool.query('SELECT id FROM pedidos WHERE id = $1', [id]);
    if (pedidoExiste.rowCount === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const result = await pool.query(
      'SELECT * FROM pedidos_historial_estados WHERE pedido_id = $1 ORDER BY fecha ASC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar historial del pedido:', error);
    res.status(500).json({ error: 'Error al consultar historial del pedido' });
  }
});

// Registro de un nuevo pedido (integración con Compradores, Productos y Notificaciones)
app.post('/pedidos', async (req, res) => {
  const { comprador_id, items, direccion_entrega, notas } = req.body;

  if (!comprador_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'Se requiere comprador_id y una lista de ítems válida'
    });
  }

  // 1. Validar identidad del comprador mediante comunicación con ms-compradores
  let comprador;
  try {
    comprador = await obtenerComprador(comprador_id);
    if (!comprador) {
      return res.status(404).json({
        error: `El comprador con ID ${comprador_id} no existe en el sistema`
      });
    }
  } catch (error) {
    console.error('Error de comunicación con Compradores:', error.message);
    return res.status(502).json({
      error: 'No se pudo verificar la identidad del comprador debido a un fallo en el servicio de Compradores'
    });
  }

  const direccionFinal = direccion_entrega || comprador.direccion_entrega;
  if (!direccionFinal) {
    return res.status(400).json({ error: 'Dirección de entrega obligatoria no especificada' });
  }

  // 2. Validar cada producto en ms-productos-catalogo (precios, stock y existencia)
  const productosVerificados = [];
  let totalCalculado = 0;
  let productorIdPrincipal = null;

  try {
    for (const item of items) {
      if (!item.producto_id || !item.cantidad || Number(item.cantidad) <= 0) {
        return res.status(400).json({ error: 'Cada ítem debe tener un producto_id y una cantidad positiva' });
      }

      const prod = await obtenerProducto(item.producto_id);
      if (!prod) {
        return res.status(404).json({
          error: `El producto con ID ${item.producto_id} no existe en el catálogo`
        });
      }

      if (!prod.activo) {
        return res.status(400).json({
          error: `El producto "${prod.nombre}" no está activo para venta`
        });
      }

      const cantidadSolicitada = Number(item.cantidad);
      const stockDisponible = Number(prod.stock_disponible);

      if (stockDisponible < cantidadSolicitada) {
        return res.status(400).json({
          error: `Stock insuficiente para "${prod.nombre}". Disponible: ${stockDisponible}, Solicitado: ${cantidadSolicitada}`
        });
      }

      const precioUnitario = Number(prod.precio);
      const subtotal = precioUnitario * cantidadSolicitada;
      totalCalculado += subtotal;

      if (!productorIdPrincipal) {
        productorIdPrincipal = prod.productor_id;
      }

      productosVerificados.push({
        producto_id: prod.id,
        nombre_producto: prod.nombre,
        cantidad: cantidadSolicitada,
        unidad_medida: prod.unidad_medida,
        precio_unitario: precioUnitario,
        subtotal: Number(subtotal.toFixed(2)),
        productoOriginal: prod
      });
    }
  } catch (error) {
    console.error('Error de comunicación con Productos:', error.message);
    return res.status(502).json({
      error: 'No se pudo verificar el catálogo de productos debido a un fallo en el servicio de Productos'
    });
  }

  // 3. Persistencia transaccional local en pedidos_db
  const client = await pool.connect();
  let pedidoCreado;
  const itemsGuardados = [];

  try {
    await client.query('BEGIN');

    const pedidoInsertResult = await client.query(
      `INSERT INTO pedidos (comprador_id, productor_id, estado, total, direccion_entrega, notas)
       VALUES ($1, $2, 'PENDIENTE', $3, $4, $5) RETURNING *`,
      [comprador_id, productorIdPrincipal, totalCalculado.toFixed(2), direccionFinal, notas || null]
    );

    pedidoCreado = pedidoInsertResult.rows[0];

    for (const item of productosVerificados) {
      const itemInsertResult = await client.query(
        `INSERT INTO pedidos_items (pedido_id, producto_id, nombre_producto, cantidad, unidad_medida, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          pedidoCreado.id,
          item.producto_id,
          item.nombre_producto,
          item.cantidad,
          item.unidad_medida,
          item.precio_unitario,
          item.subtotal
        ]
      );
      itemsGuardados.push(itemInsertResult.rows[0]);
    }

    await client.query(
      `INSERT INTO pedidos_historial_estados (pedido_id, estado_anterior, estado_nuevo, motivo, cambiado_por)
       VALUES ($1, NULL, 'PENDIENTE', 'Registro inicial del pedido por el comprador', $2)`,
      [pedidoCreado.id, `comprador_${comprador_id}`]
    );

    await client.query('COMMIT');
  } catch (dbError) {
    await client.query('ROLLBACK');
    console.error('Error al persistir el pedido en la base de datos:', dbError);
    return res.status(500).json({ error: 'Error interno al registrar el pedido' });
  } finally {
    client.release();
  }

  // 4. Actualización / descuento de stock en ms-productos-catalogo
  for (const item of productosVerificados) {
    const nuevoStock = Number(item.productoOriginal.stock_disponible) - item.cantidad;
    actualizarStockProducto(item.producto_id, nuevoStock, item.productoOriginal).catch(err => {
      console.warn(`Error asíncrono al actualizar stock del producto ${item.producto_id}:`, err);
    });
  }

  // 5. Notificar la creación del pedido hacia ms-notificaciones (evento de dominio)
  const evento = {
    id_evento_origen: `pedido-${pedidoCreado.id}-creado`,
    tipo_evento: 'PEDIDO_CREADO',
    pedido_id: pedidoCreado.id,
    comprador_id: pedidoCreado.comprador_id,
    productor_id: pedidoCreado.productor_id,
    titulo: `Nuevo pedido agrícola #${pedidoCreado.id} registrado`,
    mensaje: `Se ha registrado el pedido #${pedidoCreado.id} por un total de S/ ${pedidoCreado.total}. Estado: PENDIENTE.`,
    metadata: {
      total: pedidoCreado.total,
      cantidad_items: itemsGuardados.length,
      comprador_nombre: comprador.nombre_contacto
    }
  };

  emitirEventoNotificacion(evento).catch(err => {
    console.warn('Error al emitir evento de notificación:', err);
  });

  pedidoCreado.items = itemsGuardados;
  res.status(201).json(pedidoCreado);
});

// Actualizar estado del pedido siguiendo la máquina de estados
app.patch('/pedidos/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado_nuevo, motivo, cambiado_por } = req.body;

  if (!estado_nuevo) {
    return res.status(400).json({ error: 'Debe especificar el estado_nuevo' });
  }

  const nuevoEstadoUpper = estado_nuevo.toUpperCase();

  try {
    const pedidoResult = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);
    if (pedidoResult.rowCount === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedidoActual = pedidoResult.rows[0];
    const estadoActual = pedidoActual.estado;

    const estadosPermitidos = TRANSICIONES_VALIDAS[estadoActual] || [];
    if (!estadosPermitidos.includes(nuevoEstadoUpper)) {
      return res.status(400).json({
        error: `Transición no válida de '${estadoActual}' a '${nuevoEstadoUpper}'. Transiciones permitidas: [${estadosPermitidos.join(', ')}]`
      });
    }

    const client = await pool.connect();
    let pedidoActualizado;

    try {
      await client.query('BEGIN');

      const updateResult = await client.query(
        `UPDATE pedidos
         SET estado = $1, actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [nuevoEstadoUpper, id]
      );
      pedidoActualizado = updateResult.rows[0];

      await client.query(
        `INSERT INTO pedidos_historial_estados (pedido_id, estado_anterior, estado_nuevo, motivo, cambiado_por)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, estadoActual, nuevoEstadoUpper, motivo || null, cambiado_por || 'sistema']
      );

      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    // Emisión de evento hacia ms-notificaciones
    const evento = {
      id_evento_origen: `pedido-${id}-${nuevoEstadoUpper}-${Date.now()}`,
      tipo_evento: `PEDIDO_${nuevoEstadoUpper}`,
      pedido_id: Number(id),
      comprador_id: pedidoActualizado.comprador_id,
      productor_id: pedidoActualizado.productor_id,
      titulo: `Pedido #${id} actualizado a ${nuevoEstadoUpper}`,
      mensaje: `El pedido #${id} cambió su estado a ${nuevoEstadoUpper}.${motivo ? ` Motivo: ${motivo}` : ''}`,
      metadata: { estado_anterior: estadoActual, estado_nuevo: nuevoEstadoUpper }
    };

    emitirEventoNotificacion(evento).catch(err => {
      console.warn('Error al notificar cambio de estado:', err);
    });

    res.json(pedidoActualizado);
  } catch (error) {
    console.error('Error al actualizar estado del pedido:', error);
    res.status(500).json({ error: 'Error al actualizar estado del pedido' });
  }
});

// Cancelar pedido según reglas del negocio con reposición de stock
app.post('/pedidos/:id/cancelar', async (req, res) => {
  const { id } = req.params;
  const { motivo, cambiado_por } = req.body;

  try {
    const pedidoResult = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);
    if (pedidoResult.rowCount === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedido = pedidoResult.rows[0];
    if (pedido.estado === 'CANCELADO') {
      return res.status(400).json({ error: 'El pedido ya se encuentra cancelado' });
    }

    if (!['PENDIENTE', 'CONFIRMADO'].includes(pedido.estado)) {
      return res.status(400).json({
        error: `No es posible cancelar un pedido en estado '${pedido.estado}'. Solo se permite en PENDIENTE o CONFIRMADO.`
      });
    }

    const itemsResult = await pool.query('SELECT * FROM pedidos_items WHERE pedido_id = $1', [id]);
    const items = itemsResult.rows;

    const client = await pool.connect();
    let pedidoCancelado;

    try {
      await client.query('BEGIN');

      const updateResult = await client.query(
        `UPDATE pedidos
         SET estado = 'CANCELADO', actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [id]
      );
      pedidoCancelado = updateResult.rows[0];

      await client.query(
        `INSERT INTO pedidos_historial_estados (pedido_id, estado_anterior, estado_nuevo, motivo, cambiado_por)
         VALUES ($1, $2, 'CANCELADO', $3, $4)`,
        [id, pedido.estado, motivo || 'Cancelación solicitada', cambiado_por || 'usuario']
      );

      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    // Reponer stock en ms-productos-catalogo
    for (const item of items) {
      obtenerProducto(item.producto_id).then(prod => {
        if (prod) {
          const stockRepuesto = Number(prod.stock_disponible) + Number(item.cantidad);
          actualizarStockProducto(item.producto_id, stockRepuesto, prod);
        }
      }).catch(err => console.warn('Error al reponer stock:', err));
    }

    // Emitir evento hacia ms-notificaciones
    const evento = {
      id_evento_origen: `pedido-${id}-CANCELADO-${Date.now()}`,
      tipo_evento: 'PEDIDO_CANCELADO',
      pedido_id: Number(id),
      comprador_id: pedidoCancelado.comprador_id,
      productor_id: pedidoCancelado.productor_id,
      titulo: `Pedido #${id} CANCELADO`,
      mensaje: `El pedido #${id} ha sido cancelado.${motivo ? ` Motivo: ${motivo}` : ''}`,
      metadata: { motivo, estado_anterior: pedido.estado }
    };

    emitirEventoNotificacion(evento).catch(err => console.warn('Error al notificar cancelación:', err));

    res.json({
      mensaje: 'Pedido cancelado correctamente',
      pedido: pedidoCancelado
    });
  } catch (error) {
    console.error('Error al cancelar pedido:', error);
    res.status(500).json({ error: 'Error interno al cancelar el pedido' });
  }
});

module.exports = app;
