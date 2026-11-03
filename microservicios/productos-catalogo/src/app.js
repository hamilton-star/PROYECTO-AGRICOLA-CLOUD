const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ estado: 'ok', servicio: 'productos-catalogo' });
});

// Listado de productos con filtros de categoría y provincia
app.get('/productos', async (req, res) => {
  const { categoria, provincia } = req.query;
  try {
    let query = 'SELECT * FROM productos WHERE activo = true';
    const params = [];

    if (categoria) {
      params.push(categoria);
      query += ` AND LOWER(categoria) = LOWER($${params.length})`;
    }
    if (provincia) {
      params.push(provincia);
      query += ` AND LOWER(provincia_origen) = LOWER($${params.length})`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar catálogo de productos' });
  }
});

// Detalle de un producto por ID
app.get('/productos/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// Publicar cosecha/producto
app.post('/productos', async (req, res) => {
  const { productor_id, nombre, categoria, descripcion, precio, unidad_medida, stock_disponible, provincia_origen, temporada_cosecha } = req.body;
  if (!productor_id || !nombre || !categoria || precio === undefined || !unidad_medida || stock_disponible === undefined || !provincia_origen) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (Number(precio) <= 0 || Number(stock_disponible) < 0) {
    return res.status(400).json({ error: 'Precio o stock inválido' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO productos (productor_id, nombre, categoria, descripcion, precio, unidad_medida, stock_disponible, provincia_origen, temporada_cosecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [productor_id, nombre, categoria, descripcion || null, precio, unidad_medida, stock_disponible, provincia_origen, temporada_cosecha || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al publicar producto' });
  }
});

// Actualizar producto o stock
app.put('/productos/:id', async (req, res) => {
  const { nombre, categoria, descripcion, precio, unidad_medida, stock_disponible, provincia_origen, temporada_cosecha, activo } = req.body;
  if (!nombre || !categoria || precio === undefined || !unidad_medida || stock_disponible === undefined || !provincia_origen) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const result = await pool.query(
      `UPDATE productos
       SET nombre = $1, categoria = $2, descripcion = $3, precio = $4, unidad_medida = $5, stock_disponible = $6, provincia_origen = $7, temporada_cosecha = $8, activo = COALESCE($9, activo)
       WHERE id = $10 RETURNING *`,
      [nombre, categoria, descripcion || null, precio, unidad_medida, stock_disponible, provincia_origen, temporada_cosecha || null, activo, req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Desactivar o eliminar producto
app.delete('/productos/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM productos WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ mensaje: 'Producto eliminado', producto: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = app;
