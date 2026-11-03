const app = require('./app');
const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Microservicio Compradores corriendo en el puerto ${port}`);
});
