require("dotenv").config();

const express = require("express");
const WebSocket = require("ws");

const app = express();
const server = app.listen(1234, () => {
    console.log("Server listening on port 1234");
});

const WebSocketServer = new WebSocket.WebSocketServer({ noServer: true });

const Player = require("./src/logic/Players");
const config = require("./src/constants/config");
const UTILS = require("./src/constants/utils");
const Packets = require("./src/constants/Packets");

const players = [];

WebSocketServer.on("connection", (ws) => {
    ws.on("message", (msg) => {
        ws.binaryType = "arraybuffer";

        try {
            let [type, data] = UTILS.decodeSocketMessages(msg);

            if (type == Packets.CLIENT_TO_SERVER.JOIN_GAME) {
                let player = ws.NEW_CLIENT;

                if (!ws.NEW_CLIENT) {
                    player = new Player(ws);

                    ws.NEW_CLIENT = player;
                    players.push(player);
                }

                player.setUserData(data[0]);
                player.spawn();

                player.send(Packets.SERVER_TO_CLIENT.SET_UP_GAME, player.sid);
            } else if (ws.NEW_CLIENT) {
                let player = ws.NEW_CLIENT;

                if (type == Packets.CLIENT_TO_SERVER.PING_SOCKET) {
                    player.send(Packets.SERVER_TO_CLIENT.PING_SOCKET);
                }
            }
        } catch (e) {
            console.log(e);
        }
    });

    ws.on("close", () => {});
});

setInterval(() => {}, config.serverUpdateSpeed);
setInterval(() => {}, 3e3);

server.on("upgrade", (request, socket, head) => {
    WebSocketServer.handleUpgrade(request, socket, head, (ws) => {
        WebSocketServer.emit("connection", ws, request);
    });
});
