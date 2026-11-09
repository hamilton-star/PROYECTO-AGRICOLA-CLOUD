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

jest.mock('../src/services/httpClient', () => ({
  obtenerComprador: jest.fn(),
  obtenerProducto: jest.fn(),
  actualizarStockProducto: jest.fn().mockResolvedValue(true),
  emitirEventoNotificacion: jest.fn().mockResolvedValue({ ok: true })
}));

const app = require('../src/app');
const pool = require('../src/db');
const httpClient = require('../src/services/httpClient');

describe('Pruebas de Flujo Completo y Lógica de Negocio - Pedidos', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);
  });

  test('POST /pedidos crea pedido exitosamente con validaciones de comprador y producto', async () => {
    httpClient.obtenerComprador.mockResolvedValue({
      id: 1,
      nombre_contacto: 'Mario Quispe',
      direccion_entrega: 'Av. El Sol 450, Cusco'
    });

    httpClient.obtenerProducto.mockResolvedValue({
      id: 1,
      productor_id: 201,
      nombre: 'Papa Canchón',
      categoria: 'tuberculos',
      precio: 45.00,
      stock_disponible: 100,
      unidad_medida: 'saco',
      activo: true,
      provincia_origen: 'Anta'
    });

    // Mock de transacciones
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{
          id: 10,
          comprador_id: 1,
          productor_id: 201,
          estado: 'PENDIENTE',
          total: 225.00,
          direccion_entrega: 'Av. El Sol 450, Cusco'
        }]
      }) // INSERT INTO pedidos
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          pedido_id: 10,
          producto_id: 1,
          nombre_producto: 'Papa Canchón',
          cantidad: 5,
          subtotal: 225.00
        }]
      }) // INSERT INTO pedidos_items
      .mockResolvedValueOnce({ rows: [] }) // INSERT INTO pedidos_historial_estados
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/pedidos')
      .send({
        comprador_id: 1,
        items: [{ producto_id: 1, cantidad: 5 }]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBe(10);
    expect(res.body.estado).toBe('PENDIENTE');
    expect(res.body.total).toBe(225.00);
    expect(httpClient.actualizarStockProducto).toHaveBeenCalled();
    expect(httpClient.emitirEventoNotificacion).toHaveBeenCalled();
  });

  test('POST /pedidos rechaza si el comprador no existe (404)', async () => {
    httpClient.obtenerComprador.mockResolvedValue(null);

    const res = await request(app)
      .post('/pedidos')
      .send({
        comprador_id: 999,
        items: [{ producto_id: 1, cantidad: 5 }]
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toContain('no existe en el sistema');
  });

  test('POST /pedidos rechaza si el stock es insuficiente (400)', async () => {
    httpClient.obtenerComprador.mockResolvedValue({
      id: 1,
      nombre_contacto: 'Mario Quispe',
      direccion_entrega: 'Cusco'
    });

    httpClient.obtenerProducto.mockResolvedValue({
      id: 1,
      nombre: 'Papa Canchón',
      precio: 45.00,
      stock_disponible: 3, // Solo hay 3
      activo: true
    });

    const res = await request(app)
      .post('/pedidos')
      .send({
        comprador_id: 1,
        items: [{ producto_id: 1, cantidad: 10 }] // Pide 10
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Stock insuficiente');
  });

  test('POST /pedidos rechaza si el producto no está activo (400)', async () => {
    httpClient.obtenerComprador.mockResolvedValue({
      id: 1,
      nombre_contacto: 'Mario Quispe',
      direccion_entrega: 'Cusco'
    });

    httpClient.obtenerProducto.mockResolvedValue({
      id: 1,
      nombre: 'Papa Canchón',
      precio: 45.00,
      stock_disponible: 50,
      activo: false // Inactivo
    });

    const res = await request(app)
      .post('/pedidos')
      .send({
        comprador_id: 1,
        items: [{ producto_id: 1, cantidad: 5 }]
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('no está activo');
  });

  test('POST /pedidos maneja error 502 cuando ms-compradores no responde', async () => {
    httpClient.obtenerComprador.mockRejectedValue(new Error('Connection failed'));

    const res = await request(app)
      .post('/pedidos')
      .send({
        comprador_id: 1,
        items: [{ producto_id: 1, cantidad: 5 }]
      });

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toContain('fallo en el servicio de Compradores');
  });

  test('PATCH /pedidos/:id/estado actualiza a CONFIRMADO y genera historial', async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, estado: 'PENDIENTE', comprador_id: 1, productor_id: 201 }]
    });

    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 1, estado: 'CONFIRMADO', comprador_id: 1, productor_id: 201 }]
      }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }) // INSERT historial
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .patch('/pedidos/1/estado')
      .send({
        estado_nuevo: 'CONFIRMADO',
        motivo: 'Aceptado por productor',
        cambiado_por: 'productor_201'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.estado).toBe('CONFIRMADO');
    expect(httpClient.emitirEventoNotificacion).toHaveBeenCalled();
  });

  test('PATCH /pedidos/:id/estado rechaza transición inválida (400)', async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, estado: 'PENDIENTE' }]
    });

    const res = await request(app)
      .patch('/pedidos/1/estado')
      .send({ estado_nuevo: 'ENTREGADO' }); // Inválido desde PENDIENTE

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Transición no válida');
  });

  test('POST /pedidos/:id/cancelar cancela pedido y repone stock', async () => {
    pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, estado: 'PENDIENTE', comprador_id: 1, productor_id: 201 }]
      }) // SELECT pedido
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ producto_id: 1, cantidad: 5 }]
      }); // SELECT items

    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 1, estado: 'CANCELADO', comprador_id: 1, productor_id: 201 }]
      }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }) // INSERT historial
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    httpClient.obtenerProducto.mockResolvedValue({
      id: 1,
      stock_disponible: 45
    });

    const res = await request(app)
      .post('/pedidos/1/cancelar')
      .send({ motivo: 'Cambio de planes del comprador' });

    expect(res.statusCode).toBe(200);
    expect(res.body.mensaje).toBe('Pedido cancelado correctamente');
    expect(res.body.pedido.estado).toBe('CANCELADO');
    expect(httpClient.actualizarStockProducto).toHaveBeenCalled();
    expect(httpClient.emitirEventoNotificacion).toHaveBeenCalled();
  });

  test('POST /pedidos/:id/cancelar rechaza cancelar si el pedido ya está ENTREGADO', async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, estado: 'ENTREGADO' }]
    });

    const res = await request(app)
      .post('/pedidos/1/cancelar')
      .send({ motivo: 'Ya recibido' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('No es posible cancelar un pedido en estado');
  });
});
