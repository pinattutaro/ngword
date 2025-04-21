const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

const host = "192.168.1.2";
const port = 1200;

app.get("/", (req, res) => {
    console.log('someone access');
    res.sendFile(__dirname + "/index.html");
});

app.listen(port, host , () => {
    console.log(`Server is running on ${host}:${port}`);
});