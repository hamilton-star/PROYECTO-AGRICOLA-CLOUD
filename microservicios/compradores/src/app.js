const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ estado: 'ok', servicio: 'compradores' });
});

// Listar todos los compradores o filtrar por provincia
app.get('/compradores', async (req, res) => {
  const { provincia } = req.query;
  try {
    let query = 'SELECT * FROM compradores';
    const params = [];
    if (provincia) {
      query += ' WHERE LOWER(provincia) = LOWER($1)';
      params.push(provincia);
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar compradores' });
  }
});

// Obtener comprador por ID
app.get('/compradores/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compradores WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Comprador no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener comprador' });
  }
});

// Registrar nuevo comprador
app.post('/compradores', async (req, res) => {
  const { usuario_id, nombre_contacto, razon_social, tipo_comprador, telefono, provincia, direccion_entrega } = req.body;
  if (!usuario_id || !nombre_contacto || !tipo_comprador || !telefono || !provincia || !direccion_entrega) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO compradores (usuario_id, nombre_contacto, razon_social, tipo_comprador, telefono, provincia, direccion_entrega)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [usuario_id, nombre_contacto, razon_social || null, tipo_comprador, telefono, provincia, direccion_entrega]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El usuario ya tiene un perfil de comprador registrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al registrar comprador' });
  }
});

// Actualizar perfil de comprador
app.put('/compradores/:id', async (req, res) => {
  const { nombre_contacto, razon_social, tipo_comprador, telefono, provincia, direccion_entrega } = req.body;
  if (!nombre_contacto || !tipo_comprador || !telefono || !provincia || !direccion_entrega) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const result = await pool.query(
      `UPDATE compradores
       SET nombre_contacto = $1, razon_social = $2, tipo_comprador = $3, telefono = $4, provincia = $5, direccion_entrega = $6
       WHERE id = $7 RETURNING *`,
      [nombre_contacto, razon_social || null, tipo_comprador, telefono, provincia, direccion_entrega, req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Comprador no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar comprador' });
  }
});

// Eliminar comprador
app.delete('/compradores/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM compradores WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Comprador no encontrado' });
    }
    res.json({ mensaje: 'Comprador eliminado', comprador: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar comprador' });
  }
});

module.exports = app;
