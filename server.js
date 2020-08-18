const express = require('express');

const app = express();

app.use('/', express.static('./'));

app.listen(process.env.PORT || 3001);

console.info(`server started on: http://localhost:${process.env.PORT || 3000}`);
