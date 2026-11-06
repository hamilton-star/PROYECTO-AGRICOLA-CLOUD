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

module.exports = app;
