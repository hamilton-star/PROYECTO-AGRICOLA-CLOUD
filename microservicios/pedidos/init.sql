CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  comprador_id INTEGER NOT NULL,
  productor_id INTEGER NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
  total DECIMAL(10, 2) NOT NULL,
  direccion_entrega TEXT NOT NULL,
  notas TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedidos_items (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL,
  nombre_producto VARCHAR(120) NOT NULL,
  cantidad DECIMAL(10, 2) NOT NULL,
  unidad_medida VARCHAR(30) NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS pedidos_historial_estados (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(30),
  estado_nuevo VARCHAR(30) NOT NULL,
  motivo TEXT,
  cambiado_por VARCHAR(80),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos iniciales de prueba representativos de la región Cusco
INSERT INTO pedidos (id, comprador_id, productor_id, estado, total, direccion_entrega, notas)
VALUES
  (1, 1, 201, 'PENDIENTE', 225.00, 'Av. El Sol 450, Cusco', 'Entregar temprano por la mañana'),
  (2, 2, 202, 'CONFIRMADO', 425.00, 'Jr. Comercio 120, Urubamba', 'Empaque resistente para traslado')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pedidos_items (pedido_id, producto_id, nombre_producto, cantidad, unidad_medida, precio_unitario, subtotal)
VALUES
  (1, 1, 'Papa Canchón', 5.00, 'saco', 45.00, 225.00),
  (2, 2, 'Maíz Blanco Gigante', 5.00, 'arroba', 85.00, 425.00)
ON CONFLICT DO NOTHING;

INSERT INTO pedidos_historial_estados (pedido_id, estado_anterior, estado_nuevo, motivo, cambiado_por)
VALUES
  (1, NULL, 'PENDIENTE', 'Registro inicial del pedido por el comprador', 'comprador'),
  (2, NULL, 'PENDIENTE', 'Registro inicial del pedido', 'comprador'),
  (2, 'PENDIENTE', 'CONFIRMADO', 'Productor confirmó disponibilidad de cosecha', 'productor_202')
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('pedidos', 'id'), COALESCE((SELECT MAX(id) FROM pedidos), 1));
SELECT setval(pg_get_serial_sequence('pedidos_items', 'id'), COALESCE((SELECT MAX(id) FROM pedidos_items), 1));
SELECT setval(pg_get_serial_sequence('pedidos_historial_estados', 'id'), COALESCE((SELECT MAX(id) FROM pedidos_historial_estados), 1));
