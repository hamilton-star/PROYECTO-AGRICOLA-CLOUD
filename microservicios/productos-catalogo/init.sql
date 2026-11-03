CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  categoria VARCHAR(60) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10, 2) NOT NULL,
  unidad_medida VARCHAR(30) NOT NULL,
  stock_disponible DECIMAL(10, 2) NOT NULL,
  provincia_origen VARCHAR(80) NOT NULL,
  temporada_cosecha VARCHAR(50),
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO productos (productor_id, nombre, categoria, descripcion, precio, unidad_medida, stock_disponible, provincia_origen, temporada_cosecha)
VALUES
  (201, 'Papa Canchán', 'tuberculos', 'Papa fresca seleccionada para fritura o guiso', 45.00, 'saco', 150.00, 'Anta', 'Mayo-Agosto'),
  (202, 'Maíz Blanco Gigante', 'granos', 'Maíz para exportación y consumo directo', 85.00, 'arroba', 80.00, 'Urubamba', 'Abril-Julio'),
  (203, 'Hortalizas Variadas', 'hortalizas', 'Mix de lechuga, acelga y espinaca orgánica', 18.00, 'caja', 40.00, 'Calca', 'Todo el año')
ON CONFLICT DO NOTHING;
