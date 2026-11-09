const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

afterAll(async () => {
    await pool.end();
});
test('GET /health debe responder correctamente', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.servicio).toBe('productores');
});

test('GET /productores debe devolver una lista', async () => {
    const response = await request(app).get('/productores');

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
});

test('GET /productores/1 debe devolver un producto existente', async () => {
    const response = await request(app).get('/productores/1');

    expect(response.statusCode).toBe(200);
    expect(response.body.id_productor).toBe(1);
});

