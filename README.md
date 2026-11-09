# Plataforma de Comercialización Agrícola – Cusco

## 1. Integrantes

- Mellado Champi, Jean Franco
- Champi Palacios, José
- Molina Loaiza, Ariana

## 2. Descripción general del proyecto

El proyecto consiste en desarrollar una **plataforma digital de comercialización agrícola** que facilite la conexión entre pequeños productores agrícolas de la región Cusco y compradores interesados en adquirir productos directamente.

La plataforma permitirá a los productores registrar sus perfiles, publicar sus productos, establecer precios y actualizar su disponibilidad. Por otro lado, los compradores podrán explorar un catálogo agrícola, consultar información de los productos, realizar solicitudes de compra y coordinar las entregas con los productores.

La solución estará construida bajo una arquitectura de microservicios, buscando separar las principales responsabilidades del sistema para facilitar su mantenimiento, escalabilidad y evolución.

Asimismo, se considerarán las condiciones tecnológicas de los usuarios, priorizando una interfaz intuitiva, adaptable a dispositivos móviles y optimizada para funcionar con conexiones a Internet de capacidad limitada.

## 3. Contexto geográfico

El proyecto se plantea inicialmente para la región Cusco, Perú, considerando zonas con actividad agrícola y pequeños productores que comercializan sus cosechas mediante mercados locales, ferias, centros de abasto y compradores intermediarios.

Como ámbito inicial de estudio se consideran las provincias de Anta, Calca, Urubamba y Quispicanchi, donde se buscará identificar las necesidades de comercialización de los productores agrícolas y las oportunidades de conexión con nuevos compradores.

La delimitación definitiva dependerá del diagnóstico realizado y de la disponibilidad de productores y compradores que participen en la validación de la propuesta.

## 4. Problemática identificada

Los pequeños productores agrícolas pueden enfrentar dificultades para comercializar sus productos debido al acceso limitado a nuevos canales de venta, la dependencia de mecanismos tradicionales de comercialización y la falta de herramientas digitales que permitan presentar su oferta de manera organizada.

Actualmente, la comercialización puede realizarse mediante contactos directos, mercados locales, ferias o intermediarios. Estas modalidades pueden dificultar la identificación de nuevos compradores, la consulta de precios y disponibilidad, así como la coordinación de pedidos con personas o negocios de otras localidades.

De igual manera, los compradores pueden encontrar dificultades para identificar productores, comparar ofertas y conocer las cantidades disponibles antes de realizar una adquisición.

Ante esta situación, se plantea desarrollar una plataforma que centralice la oferta agrícola y facilite la interacción comercial entre productores y compradores.

### Principales necesidades identificadas

- Mejorar la visibilidad de los productos agrícolas disponibles.
- Facilitar la conexión entre productores y compradores.
- Centralizar la información sobre productos, precios y cantidades.
- Simplificar la gestión y coordinación de pedidos.
- Ampliar las oportunidades de comercialización de pequeños productores.

## 5. Usuarios objetivo

La plataforma estará dirigida a los siguientes grupos:

| Usuario | Descripción |
|---|---|
| Pequeños productores agrícolas | Agricultores individuales o familiares que buscan ofrecer sus productos a nuevos compradores. |
| Asociaciones agrícolas | Organizaciones que agrupan productores y buscan mejorar la comercialización de sus productos. |
| Comerciantes mayoristas | Compradores que adquieren productos agrícolas en cantidades importantes para su distribución o comercialización. |
| Restaurantes y negocios gastronómicos | Establecimientos que necesitan abastecerse periódicamente de productos agrícolas. |
| Comerciantes minoristas | Personas o negocios que adquieren productos para su posterior venta. |
| Administradores | Responsables de supervisar usuarios, publicaciones y funcionamiento general de la plataforma. |

### Consideraciones tecnológicas de los usuarios

El diseño de la plataforma tendrá en cuenta las siguientes condiciones:

- **Conectividad:** optimización del consumo de datos y consideración de conexiones intermitentes.
- **Dispositivos:** prioridad de acceso mediante teléfonos inteligentes, sin excluir computadoras.
- **Usabilidad:** interfaces sencillas y formularios fáciles de comprender.
- **Accesibilidad económica:** minimizar los costos de acceso para los pequeños productores.
- **Adaptación tecnológica:** facilitar el aprendizaje y la utilización de la plataforma mediante procesos intuitivos.

## 6. Propuesta de solución

Se propone desarrollar una plataforma digital que funcione como un espacio de comercialización agrícola, donde los productores puedan ofrecer sus productos y los compradores puedan encontrar proveedores, consultar ofertas y realizar solicitudes de compra.

### Flujo general de funcionamiento

**1. Registro de usuarios**

Los productores y compradores podrán crear una cuenta en la plataforma, registrar sus datos y acceder a las funcionalidades correspondientes a su perfil.

**2. Gestión de productores**

Los agricultores podrán completar su información, registrar su ubicación o zona de producción y administrar su perfil comercial.

**3. Publicación de productos**

Los productores podrán publicar sus productos indicando nombre, fotografías, categoría, precio, unidad de medida, cantidad disponible y temporada de cosecha.

**4. Exploración del catálogo**

Los compradores podrán consultar los productos publicados y utilizar filtros por categoría, ubicación, precio y disponibilidad.

**5. Gestión de pedidos**

Los compradores podrán seleccionar los productos de interés, especificar las cantidades y enviar solicitudes de compra a los productores.

**6. Confirmación y coordinación**

Los productores podrán revisar las solicitudes, aceptarlas o rechazarlas y coordinar las condiciones de entrega con los compradores.

**7. Seguimiento de pedidos**

Ambas partes podrán consultar el estado de sus solicitudes y mantener un historial de las operaciones realizadas.

### Beneficios esperados

- Mayor visibilidad de la oferta agrícola.
- Nuevas oportunidades de conexión comercial.
- Acceso organizado a información sobre productos y disponibilidad.
- Mejor organización de las solicitudes de compra.
- Un canal digital complementario a los mecanismos tradicionales de comercialización.

La plataforma busca complementar los canales comerciales existentes, sin pretender eliminar la participación de intermediarios ni garantizar condiciones comerciales específicas.

## 7. Arquitectura del sistema: Microservicios

El proyecto utiliza una arquitectura basada en microservicios, donde las responsabilidades del sistema se distribuyen en servicios independientes que gestionan funciones específicas del negocio.

La propuesta funcional contempla las siguientes responsabilidades:

| Microservicio o responsabilidad | Función principal |
|---|---|
| Usuarios y autenticación | Gestionar el registro, inicio de sesión, roles y permisos. |
| Productores | Administrar los perfiles e información de los agricultores y asociaciones. |
| Productos y catálogo | Depende de los productores q suban los productos y la visualización hacia los usuarios |
| Compradores | Administrar los perfiles y datos de los compradores o usuarios. |
| Pedidos | Gestionar solicitudes, confirmaciones y estados de compra. |
| Notificaciones | Comunicar eventos y actualizaciones importantes a los usuarios. |

**Nota de arquitectura:** estas son las responsabilidades funcionales identificadas para el proyecto. Su distribución definitiva debe corresponder con los servicios de aplicación realmente implementados en el repositorio.

### Comunicación entre microservicios

La comunicación del sistema contempla los siguientes mecanismos:

- **API REST:** permite el intercambio de información entre la interfaz de usuario, el API Gateway y los microservicios mediante solicitudes HTTP y respuestas JSON.
- **Mensajería asíncrona:** permite comunicar eventos entre servicios para ejecutar procesos secundarios, como las notificaciones de nuevos pedidos o confirmaciones.
- *API Gateway:** funciona como punto de entrada para las solicitudes provenientes de la aplicación, distribuyéndolas hacia los servicios correspondientes.

Los productores y compradores interactuarán con la plataforma mediante la interfaz web o móvil, sin acceder directamente a los microservicios ni a sus bases de datos.

## 8. Consideraciones de desarrollo

Durante el desarrollo se tendrán en cuenta los siguientes aspectos:

- Modularidad y separación de responsabilidades.
- Independencia de los servicios.
- Seguridad en la autenticación y autorización.
- Protección de la información de los usuarios.
- Optimización del rendimiento y consumo de recursos.
- Facilidad de mantenimiento y futuras ampliaciones.
- Validación de las funcionalidades mediante pruebas de software.

## 9. Estado y alcance del proyecto

El proyecto contempla el desarrollo progresivo de una plataforma de comercialización agrícola basada en microservicios.

La primera versión estará enfocada en las funcionalidades esenciales para conectar productores y compradores, gestionar publicaciones agrícolas y administrar solicitudes de compra.

Las funcionalidades adicionales, como pagos electrónicos, logística de transporte, seguimiento de entregas y mecanismos avanzados de análisis comercial, podrán evaluarse en futuras etapas de evolución del sistema.
