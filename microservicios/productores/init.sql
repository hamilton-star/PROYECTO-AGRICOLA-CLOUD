CREATE TABLE IF NOT EXISTS productores (
    id_productor SERIAL PRIMARY KEY,
    nombre_finca VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(150) NOT NULL,
    principal_cultivo VARCHAR(100) NOT NULL,
    certificado_organico BOOLEAN DEFAULT FALSE
);

INSERT INTO productores (id_productor, nombre_finca, ubicacion, principal_cultivo, certificado_organico) VALUES
(1, 'Finca El Paraíso', 'Valle Sagrado, Cusco', 'Maíz Amarillo', TRUE),
(2, 'AgroAsociación Siquijahuanca', 'Anta, Cusco', 'Papa Nativa', FALSE),
(3, 'Cítricos de la Convención', 'Quillabamba, Cusco', 'Cítricos / Café', TRUE),
(4, 'Granja Andina Písac', 'Písac, Cusco', 'Hortalizas', TRUE),
(5, 'Producciones Chinchero', 'Chinchero, Cusco', 'Quinua Orgánica', TRUE);
