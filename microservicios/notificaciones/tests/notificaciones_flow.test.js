const request = require('supertest');

// Mocks antes de requerir la app
jest.mock('../src/db', () => {
  const mClient = {
    query: jest.fn(),
    release: jest.fn()
  };
  return {
    query: jest.fn(),
    connect: jest.fn(() => Promise.resolve(mClient)),
    end: jest.fn(() => Promise.resolve())
  };
});

const app = require('../src/app');
const pool = require('../src/db');

describe('Pruebas de Flujo Completo y Lógica de Negocio - Notificaciones', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);
  });

  test('POST /notificaciones/eventos genera notificaciones para comprador y productor', async () => {
    // 1. SELECT id FROM notificaciones WHERE id_evento_origen (idempotencia) -> No existe
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    // 2. Transacción de inserción
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          id_evento_origen: 'evt-101-comprador',
          usuario_destinatario_id: 1,
          tipo_destinatario: 'comprador',
          tipo_evento: 'PEDIDO_CREADO',
          titulo: 'Nuevo pedido #10',
          mensaje: 'Pedido registrado'
        }]
      }) // INSERT comprador
      .mockResolvedValueOnce({
        rows: [{
          id: 2,
          id_evento_origen: 'evt-101-productor',
          usuario_destinatario_id: 201,
          tipo_destinatario: 'productor',
          tipo_evento: 'PEDIDO_CREADO',
          titulo: 'Nuevo pedido #10',
          mensaje: 'Pedido registrado'
        }]
      }) // INSERT productor
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/notificaciones/eventos')
      .send({
        id_evento_origen: 'evt-101',
        tipo_evento: 'PEDIDO_CREADO',
        pedido_id: 10,
        comprador_id: 1,
        productor_id: 201,
        titulo: 'Nuevo pedido #10',
        mensaje: 'Pedido registrado',
        metadata: { total: 225.00 }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.total_generadas).toBe(2);
    expect(res.body.notificaciones).toHaveLength(2);
  });

  test('POST /notificaciones/eventos evita duplicados si el evento ya fue procesado (Idempotencia)', async () => {
    // Retorna que el evento ya existe en base de datos
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, id_evento_origen: 'evt-101-comprador' }]
    });

    const res = await request(app)
      .post('/notificaciones/eventos')
      .send({
        id_evento_origen: 'evt-101',
        tipo_evento: 'PEDIDO_CREADO',
        comprador_id: 1
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.idempotente).toBe(true);
    expect(res.body.mensaje).toContain('ya procesado previamente');
    // Asegurarse de que no se inició una nueva transacción de inserción
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('GET /notificaciones filtra correctamente por usuario_id', async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        usuario_destinatario_id: 1,
        titulo: 'Pedido confirmado',
        leida: false
      }]
    });

    const res = await request(app).get('/notificaciones?usuario_id=1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].usuario_destinatario_id).toBe(1);
  });

  test('PATCH /notificaciones/:id/leida marca la notificación como leída', async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        leida: true,
        leida_en: new Date().toISOString()
      }]
    });

    const res = await request(app).patch('/notificaciones/1/leida');
    expect(res.statusCode).toBe(200);
    expect(res.body.mensaje).toBe('Notificación marcada como leída');
    expect(res.body.notificacion.leida).toBe(true);
  });

  test('PATCH /notificaciones/usuario/:usuario_id/leer-todas actualiza todas las pendientes', async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 3,
      rows: [{ id: 1 }, { id: 2 }, { id: 3 }]
    });

    const res = await request(app).patch('/notificaciones/usuario/1/leer-todas');
    expect(res.statusCode).toBe(200);
    expect(res.body.cantidad_marcadas).toBe(3);
    expect(res.body.usuario_id).toBe(1);
  });

  test('GET /notificaciones/usuario/:usuario_id/resumen retorna conteos de leídas y no leídas', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: '5' }] })
      .mockResolvedValueOnce({ rows: [{ no_leidas: '2' }] });

    const res = await request(app).get('/notificaciones/usuario/1/resumen');
    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(5);
    expect(res.body.no_leidas).toBe(2);
    expect(res.body.leidas).toBe(3);
  });
});
