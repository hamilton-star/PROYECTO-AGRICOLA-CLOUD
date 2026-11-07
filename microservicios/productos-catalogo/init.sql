CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  productor_id INTEGER NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  categoria VARCHAR(60) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10, 2) NOT NULL,
  unidad_medida VARCHAR(30) NOT NULL,
  stock_disponible DECIMAL(10, 2) NOT NULL,
  provincia_origen VARCHAR(80) NOT NULL,
  temporada_cosecha VARCHAR(50)
);

INSERT INTO productos (usuario_id, productor_id, nombre, categoria, descripcion, precio, unidad_medida, stock_disponible, provincia_origen, temporada_cosecha)
VALUES
  ('1', '1', 'Papa', 'tuberculos', 'Papa fresca seleccionada para fritura o guiso', 45.00, 'saco', 150.00, 'Anta', 'Mayo-Agosto'),
  ('2', '2', 'Maiz',  'granos', 'Maíz para exportación y consumo directo', 85.00, 'arroba', 80.00, 'Urubamba', 'Abril-Julio'),
  ('3', '3', 'Lechuga', 'hortalizas', 'Mix de lechuga, acelga y espinaca orgánica', 18.00, 'caja', 40.00, 'Calca', 'Todo el año')
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('productos', 'id'), (SELECT MAX(id) FROM productos));
