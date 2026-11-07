const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

// Chequeo de salud
app.get('/health', (req, res) => {
  res.json({ estado: 'ok', servicio: 'notificaciones' });
});

// Recepción y procesamiento de eventos de pedidos y del sistema (Idempotente)
app.post('/notificaciones/eventos', async (req, res) => {
  const {
    id_evento_origen,
    tipo_evento,
    pedido_id,
    comprador_id,
    productor_id,
    titulo,
    mensaje,
    metadata
  } = req.body;

  if (!id_evento_origen || !tipo_evento) {
    return res.status(400).json({
      error: 'Se requiere id_evento_origen y tipo_evento para procesar el evento'
    });
  }

  // 1. Verificación de idempotencia para evitar notificaciones duplicadas
  try {
    const eventoExistente = await pool.query(
      'SELECT id FROM notificaciones WHERE id_evento_origen LIKE $1 LIMIT 1',
      [`${id_evento_origen}%`]
    );

    if (eventoExistente.rowCount > 0) {
      return res.status(200).json({
        mensaje: 'Evento ya procesado previamente (idempotente)',
        idempotente: true,
        id_evento_origen
      });
    }

    const notificacionesAGenerar = [];

    // Notificación destinada al comprador
    if (comprador_id) {
      const tituloComprador = titulo || `Actualización de pedido #${pedido_id || ''}`;
      const mensajeComprador = mensaje || `Tu pedido ha registrado el evento: ${tipo_evento}.`;
      notificacionesAGenerar.push({
        id_evento_origen: `${id_evento_origen}-comprador`,
        usuario_destinatario_id: comprador_id,
        tipo_destinatario: 'comprador',
        tipo_evento,
        titulo: tituloComprador,
        mensaje: mensajeComprador,
        pedido_id: pedido_id || null,
        metadata: metadata ? JSON.stringify(metadata) : '{}'
      });
    }

    // Notificación destinada al productor
    if (productor_id) {
      const tituloProductor = titulo || `Aviso sobre pedido agrícola #${pedido_id || ''}`;
      const mensajeProductor = mensaje || `Se ha registrado el evento ${tipo_evento} para tu producción.`;
      notificacionesAGenerar.push({
        id_evento_origen: `${id_evento_origen}-productor`,
        usuario_destinatario_id: productor_id,
        tipo_destinatario: 'productor',
        tipo_evento,
        titulo: tituloProductor,
        mensaje: mensajeProductor,
        pedido_id: pedido_id || null,
        metadata: metadata ? JSON.stringify(metadata) : '{}'
      });
    }

    if (notificacionesAGenerar.length === 0) {
      return res.status(400).json({
        error: 'Debe indicarse al menos un destinatario (comprador_id o productor_id)'
      });
    }

    const notificacionesInsertadas = [];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      for (const notif of notificacionesAGenerar) {
        const insertRes = await client.query(
          `INSERT INTO notificaciones (
            id_evento_origen, usuario_destinatario_id, tipo_destinatario,
            tipo_evento, titulo, mensaje, pedido_id, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            notif.id_evento_origen,
            notif.usuario_destinatario_id,
            notif.tipo_destinatario,
            notif.tipo_evento,
            notif.titulo,
            notif.mensaje,
            notif.pedido_id,
            notif.metadata
          ]
        );
        notificacionesInsertadas.push(insertRes.rows[0]);
      }
      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      if (txError.code === '23505') {
        // Restricción única violada de id_evento_origen ante condición de carrera concurrente
        return res.status(200).json({
          mensaje: 'Evento duplicado detectado por restricción de base de datos',
          idempotente: true
        });
      }
      throw txError;
    } finally {
      client.release();
    }

    res.status(201).json({
      mensaje: 'Notificaciones generadas correctamente',
      total_generadas: notificacionesInsertadas.length,
      notificaciones: notificacionesInsertadas
    });
  } catch (error) {
    console.error('Error al procesar evento de notificación:', error);
    res.status(500).json({ error: 'Error interno al procesar el evento de notificación' });
  }
});

// Listado de notificaciones con filtros opcionales
app.get('/notificaciones', async (req, res) => {
  const { usuario_id, tipo_destinatario, leida, pedido_id } = req.query;
  try {
    let query = 'SELECT * FROM notificaciones WHERE 1=1';
    const params = [];

    if (usuario_id) {
      params.push(usuario_id);
      query += ` AND usuario_destinatario_id = $${params.length}`;
    }
    if (tipo_destinatario) {
      params.push(tipo_destinatario.toLowerCase());
      query += ` AND LOWER(tipo_destinatario) = $${params.length}`;
    }
    if (leida !== undefined) {
      params.push(leida === 'true');
      query += ` AND leida = $${params.length}`;
    }
    if (pedido_id) {
      params.push(pedido_id);
      query += ` AND pedido_id = $${params.length}`;
    }

    query += ' ORDER BY creado_en DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar notificaciones:', error);
    res.status(500).json({ error: 'Error al consultar notificaciones' });
  }
});

// Detalle de una notificación por ID
app.get('/notificaciones/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM notificaciones WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener notificación:', error);
    res.status(500).json({ error: 'Error al obtener notificación' });
  }
});

// Marcar notificación individual como leída
app.patch('/notificaciones/:id/leida', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE notificaciones
       SET leida = true, leida_en = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json({
      mensaje: 'Notificación marcada como leída',
      notificacion: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar estado de lectura:', error);
    res.status(500).json({ error: 'Error al actualizar notificación' });
  }
});

// Marcar todas las notificaciones pendientes de un usuario como leídas
app.patch('/notificaciones/usuario/:usuario_id/leer-todas', async (req, res) => {
  const { usuario_id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE notificaciones
       SET leida = true, leida_en = CURRENT_TIMESTAMP
       WHERE usuario_destinatario_id = $1 AND leida = false
       RETURNING id`,
      [usuario_id]
    );

    res.json({
      mensaje: 'Notificaciones del usuario actualizadas',
      usuario_id: Number(usuario_id),
      cantidad_marcadas: result.rowCount
    });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones:', error);
    res.status(500).json({ error: 'Error interno al actualizar notificaciones del usuario' });
  }
});

// Resumen y conteo de notificaciones por usuario
app.get('/notificaciones/usuario/:usuario_id/resumen', async (req, res) => {
  const { usuario_id } = req.params;
  try {
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM notificaciones WHERE usuario_destinatario_id = $1',
      [usuario_id]
    );
    const noLeidasResult = await pool.query(
      'SELECT COUNT(*) as no_leidas FROM notificaciones WHERE usuario_destinatario_id = $1 AND leida = false',
      [usuario_id]
    );

    const total = parseInt(totalResult.rows[0].total, 10);
    const no_leidas = parseInt(noLeidasResult.rows[0].no_leidas, 10);
    const leidas = total - no_leidas;

    res.json({
      usuario_id: Number(usuario_id),
      total,
      no_leidas,
      leidas
    });
  } catch (error) {
    console.error('Error al obtener resumen de notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener resumen de notificaciones' });
  }
});

module.exports = app;
