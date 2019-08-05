var express = require('express');

var app = express();

app.use('/', express.static('./'));

app.listen(process.env.PORT || 3000);

console.log(`server started on: http://localhost:${process.env.PORT || 3000}/a-wc-router/examples/`);