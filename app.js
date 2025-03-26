const express = require("express");
const morgan = require("morgan");
const app = express();

app.use(express.json());
app.use(morgan('dev'));

app.get('/',(req,res)=>{
    res.status(200).send("Hello from server!!");
})
module.exports = app;
