require("dotenv").config();

const express = require("express");
const WebSocket = require("ws");

const app = express();
const server = app.listen(3030, () => {
    console.log("Server listening on port 3030");
});

const WebSocketServer = new WebSocket.WebSocketServer({ noServer: true });

WebSocketServer.on("connection", (ws, request) => {
    ws.on("message", (msg) => {});

    ws.on("close", () => {});
});

server.on("upgrade", (request, socket, head) => {
    WebSocketServer.handleUpgrade(request, socket, head, (ws) => {
        WebSocketServer.emit("connection", ws, request);
    });
});
