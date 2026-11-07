CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  id_evento_origen VARCHAR(120) NOT NULL UNIQUE,
  usuario_destinatario_id INTEGER NOT NULL,
  tipo_destinatario VARCHAR(30) NOT NULL,
  tipo_evento VARCHAR(50) NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  mensaje TEXT NOT NULL,
  pedido_id INTEGER,
  leida BOOLEAN DEFAULT false,
  leida_en TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificaciones(usuario_destinatario_id, leida);
CREATE INDEX IF NOT EXISTS idx_notif_evento ON notificaciones(id_evento_origen);

-- Datos iniciales de prueba para Cusco
INSERT INTO notificaciones (
  id_evento_origen, usuario_destinatario_id, tipo_destinatario, tipo_evento,
  titulo, mensaje, pedido_id, leida, metadata
)
VALUES
  (
    'seed-evt-pedido-1-comprador',
    1,
    'comprador',
    'PEDIDO_CREADO',
    'Pedido #1 registrado',
    'Tu pedido de 5 sacos de Papa Canchón ha sido registrado con éxito.',
    1,
    false,
    '{"total": 225.00, "provincia": "Anta"}'::jsonb
  ),
  (
    'seed-evt-pedido-1-productor',
    201,
    'productor',
    'PEDIDO_CREADO',
    'Nueva solicitud de compra recibida',
    'El comprador Mario Quispe ha solicitado 5 sacos de Papa Canchón.',
    1,
    false,
    '{"total": 225.00, "comprador": "Mario Quispe"}'::jsonb
  ),
  (
    'seed-evt-pedido-2-comprador',
    2,
    'comprador',
    'PEDIDO_CONFIRMADO',
    'Pedido #2 confirmado',
    'El productor ha confirmado tu pedido de 5 arrobas de Maíz Blanco Gigante.',
    2,
    true,
    '{"total": 425.00, "provincia": "Urubamba"}'::jsonb
  )
ON CONFLICT (id_evento_origen) DO NOTHING;

SELECT setval(pg_get_serial_sequence('notificaciones', 'id'), COALESCE((SELECT MAX(id) FROM notificaciones), 1));
