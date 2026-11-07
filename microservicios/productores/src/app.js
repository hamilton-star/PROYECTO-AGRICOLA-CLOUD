const express = require('express');
const pool = require('./db');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ estado: 'ok', servicio: 'productores' });
});

app.get('/productores', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productores');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error al consultar productores'
        });
    }
});

app.get('/productores/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM productores WHERE id_productor = $1',
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Productor no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar al productor' });
    }
});


module.exports = app;

app.post('/productores', async (req, res) => {

    const { nombre_finca, ubicacion, principal_cultivo, certificado_organico } = req.body;


    if (!nombre_finca || !ubicacion || !principal_cultivo) {
        return res.status(400).json({
            error: 'nombre_finca, ubicacion y principal_cultivo son obligatorios'
        });
    }

    try {
        const query = `
            INSERT INTO productores (nombre_finca, ubicacion, principal_cultivo, certificado_organico)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const values = [
            nombre_finca,
            ubicacion,
            principal_cultivo,
            certificado_organico ?? false
        ];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear productor:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear el productor' });
    }
});

app.put('/productores/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_finca, ubicacion, principal_cultivo, certificado_organico } = req.body;

    if (!nombre_finca || !ubicacion || !principal_cultivo) {
        return res.status(400).json({
            error: 'nombre_finca, ubicacion y principal_cultivo son obligatorios para actualizar'
        });
    }

    try {
        const query = `
            UPDATE productores
            SET nombre_finca = $1,
                ubicacion = $2,
                principal_cultivo = $3,
                certificado_organico = $4
            WHERE id_productor = $5
            RETURNING *
        `;
        const values = [
            nombre_finca,
            ubicacion,
            principal_cultivo,
            certificado_organico ?? false,
            id
        ];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Productor no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar productor:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el productor' });
    }
});

app.delete('/productores/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM productores WHERE id_productor = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Productor no encontrado' });
        }

        res.json({
            mensaje: 'Productor eliminado correctamente',
            productor_eliminado: result.rows[0]
        });
    } catch (error) {
        console.error('Error al eliminar productor:', error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar el productor' });
    }
});
