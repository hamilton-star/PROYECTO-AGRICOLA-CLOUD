const app = require('./app');
const port = process.env.PORT || 3002;

app.listen(port, () => {
  console.log(`Microservicio Productos y Catálogo corriendo en el puerto ${port}`);
});
