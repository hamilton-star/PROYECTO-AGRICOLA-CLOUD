CREATE TABLE IF NOT EXISTS compradores (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL UNIQUE,
  nombre_contacto VARCHAR(120) NOT NULL,
  razon_social VARCHAR(150),
  tipo_comprador VARCHAR(50) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  provincia VARCHAR(80) NOT NULL,
  direccion_entrega TEXT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO compradores (usuario_id, nombre_contacto, razon_social, tipo_comprador, telefono, provincia, direccion_entrega)
VALUES
  (101, 'Mario Quispe', 'Restaurante Cusqueñito SAC', 'restaurante', '984123456', 'Cusco', 'Av. El Sol 450'),
  (102, 'Lucía Valenzuela', 'Comercializadora del Sur EIRL', 'mayorista', '984654321', 'Urubamba', 'Jr. Comercio 120'),
  (103, 'Jorge Huamán', 'Verdulería Don Jorge', 'minorista', '984987123', 'Anta', 'Mercado Central Puesto 14')
ON CONFLICT (usuario_id) DO NOTHING;
