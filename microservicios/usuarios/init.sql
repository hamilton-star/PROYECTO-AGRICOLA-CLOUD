CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    rol VARCHAR(50) NOT NULL,
    telefono VARCHAR(20),
    fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE
);

INSERT INTO usuarios (id_usuario, nombre, correo, rol, telefono, fecha_registro) VALUES
(4, 'María Huamán', 'maria.huaman@email.com', 'Comprador', '+51 922334455', '2026-02-10'),
(5, 'Jorge Cárdenas', 'jorge.cardenas@email.com', 'Productor', '+51 998877665', '2026-02-18');
