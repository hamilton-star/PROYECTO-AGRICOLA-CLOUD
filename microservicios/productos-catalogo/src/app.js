const express = require('express');
const pool = require('./db');

const app = express();

async function validarReferencias(usuario_id, productor_id) {
    const [usuarios, productores] = await Promise.all([
        fetch(`${process.env.USUARIOS_URL}/usuarios/${usuario_id}`),
        fetch(`${process.env.PRODUCTORES_URL}/productores/${productor_id}`)
    ]);

    if (usuarios.status === 404 || productores.status === 404) {
        return false;
    }

    if (!usuarios.ok || !productores.ok) {
        throw new Error('Error al consultar Usuarios o Productos');
    }

    return true;
}

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ estado: 'ok', servicio: 'productos-catalogo' });
});


app.get('/productos', async (req, res) => {
  const { categoria, provincia } = req.query;
  try {
    let query = 'SELECT * FROM productos WHERE 1=1';
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
    console.error('Error al consultar productos:', error);
    res.status(500).json({ error: 'Error al consultar catálogo de productos' });
  }
});

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

app.post('/productos', async (req, res) => {
    const {
        usuario_id,
        productor_id,
        nombre,
        categoria,
        descripcion,
        precio,
        unidad_medida,
        stock_disponible,
        provincia_origen,
        temporada_cosecha,
    } = req.body;


    if (!usuario_id || !productor_id || !nombre || !categoria || !descripcion || precio === undefined || !unidad_medida || stock_disponible === undefined || !provincia_origen || !temporada_cosecha) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para el producto' });
    }


    if (![usuario_id, productor_id].every(
        valor => Number.isInteger(Number(valor)) && Number(valor) > 0
    )) {
        return res.status(400).json({
            error: 'Los identificadores (productor_id, usuario_id) deben ser enteros positivos'
        });
    }

    if (Number(precio) <= 0 || Number(stock_disponible) < 0) {
        return res.status(400).json({ error: 'Precio o stock inválido' });
    }

    try {

        const referenciasValidas = await validarReferencias(
            usuario_id,
            productor_id
        );

        if (!referenciasValidas) {
            return res.status(400).json({
                error: 'El usuario o productor indicado no existe'
            });
        }


        const result = await pool.query(
            `INSERT INTO productos (
                usuario_id, productor_id, nombre, categoria, descripcion, precio,
                unidad_medida, stock_disponible, provincia_origen, temporada_cosecha
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                usuario_id,
                productor_id,
                nombre,
                categoria,
                descripcion || null,
                precio,
                unidad_medida,
                stock_disponible,
                provincia_origen,
                temporada_cosecha || null,
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al publicar producto:', error);
        res.status(500).json({ error: 'Error al publicar producto' });
    }
});

app.put('/productos/:id', async (req, res) => {
  const {
    usuario_id,
    productor_id,
    nombre,
    categoria,
    descripcion,
    precio,
    unidad_medida,
    stock_disponible,
    provincia_origen,
    temporada_cosecha,
  } = req.body;


  if (!usuario_id || !productor_id || !nombre || !categoria || !descripcion || precio === undefined || !unidad_medida || stock_disponible === undefined || !provincia_origen || !temporada_cosecha) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para el producto' });
  }


  if (![usuario_id, productor_id].every(
      valor => Number.isInteger(Number(valor)) && Number(valor) > 0
  )) {
      return res.status(400).json({
          error: 'Los identificadores de usuario y productor deben ser enteros positivos'
      });
  }

  try {
      const referenciasValidas = await validarReferencias(
          usuario_id,
          productor_id
      );

      if (!referenciasValidas) {
          return res.status(400).json({
              error: 'El usuario o productor indicado no existe en los servicios correspondientes'
          });
      }


      const result = await pool.query(
          `UPDATE productos
           SET usuario_id = $1, productor_id = $2, nombre = $3, categoria = $4, descripcion = $5, precio = $6, unidad_medida = $7,
               stock_disponible = $8, provincia_origen = $9, temporada_cosecha = $10,

           WHERE id = $11 RETURNING *`,
          [
            usuario_id,
            productor_id,
            nombre,
            categoria,
            descripcion || null,
            precio,
            unidad_medida,
            stock_disponible,
            provincia_origen,
            temporada_cosecha || null,
            req.params.id
          ]
      );

      if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Producto no encontrado' });
      }

      res.json(result.rows[0]);
  } catch (error) {
      console.error('Error al actualizar el producto:', error);
      res.status(500).json({ error: 'Error al actualizar producto en el servidor' });
  }
});

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
