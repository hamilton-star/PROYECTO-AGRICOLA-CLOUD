const app = require('./app');
const port = process.env.PORT || 3006;

app.listen(port, () => {
  console.log(`Microservicio de Notificaciones corriendo en el puerto ${port}`);
});
