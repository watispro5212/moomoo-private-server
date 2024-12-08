require("dotenv").config();

const express = require("express");
const { WebSocket } = require("ws");

const app = express();

app.listen(3030, () => {
    console.log("Server listening to port 3030");
});