const express = require('express');
const pool = require('./db');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ estado: 'ok', servicio: 'usuarios' });
});

app.get('/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM usuarios');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error al consultar usuarios'
        });
    }
});

app.get('/usuarios/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE id_usuario = $1',
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'usuarios no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar usuarios' });
    }
});


module.exports = app;

app.post('/usuarios', async (req, res) => {
    const { nombre, correo, rol, telefono } = req.body;


    if (!nombre || !correo || !rol) {
        return res.status(400).json({
            error: 'Los campos nombre, correo y rol son obligatorios'
        });
    }

    try {
        const query = `
            INSERT INTO usuarios (nombre, correo, rol, telefono)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const values = [nombre, correo, rol, telefono || null];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear usuario:', error);


        if (error.code === '23505') {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
        }

        res.status(500).json({ error: 'Error interno del servidor al crear el usuario' });
    }
});

app.put('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, correo, rol, telefono } = req.body;

    if (!nombre || !correo || !rol) {
        return res.status(400).json({
            error: 'Los campos nombre, correo y rol son obligatorios para actualizar'
        });
    }

    try {
        const query = `
            UPDATE usuarios
            SET nombre = $1,
                correo = $2,
                rol = $3,
                telefono = $4
            WHERE id_usuario = $5
            RETURNING *
        `;
        const values = [nombre, correo, rol, telefono || null, id];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar usuario:', error);

        if (error.code === '23505') {
            return res.status(400).json({ error: 'El correo electrónico ya pertenece a otro usuario' });
        }

        res.status(500).json({ error: 'Error interno del servidor al actualizar el usuario' });
    }
});

app.delete('/usuarios/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM usuarios WHERE id_usuario = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            mensaje: 'Usuario eliminado correctamente',
            usuario_eliminado: result.rows[0]
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar el usuario' });
    }
});
