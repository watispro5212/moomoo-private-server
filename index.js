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
const gameObjects = [];

module.exports.gameObjects = gameObjects;

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
                player.send(Packets.SERVER_TO_CLIENT.ADD_PLAYER, player.getData(), true);
                sendLeaderboardData(player);
            } else if (ws.NEW_CLIENT) {
                let player = ws.NEW_CLIENT;

                if (type == Packets.CLIENT_TO_SERVER.PING_SOCKET) {
                    player.send(Packets.SERVER_TO_CLIENT.PING_SOCKET);
                } else if (type == Packets.CLIENT_TO_SERVER.MOVE) {
                    player.moveDir = data[0];
                }
            }
        } catch (e) {
            console.log(e);
        }
    });

    ws.on("close", () => {
        if (ws.NEW_CLIENT) {
            let CLIENT_ID = ws.NEW_CLIENT.id;

            for (let i = 0; i < players.length; i++) {
                if (players[i].sentTo[CLIENT_ID]) {
                    players[i].send(Packets.SERVER_TO_CLIENT.REMOVE_PLAYER, CLIENT_ID);
                }
            }
        }
    });
});

setInterval(() => {
    for (let i = 0; i < players.length; i++) {
        let player = players[i];

        if (player) {
            player.update(config.serverUpdateSpeed);

            let data = [];

            for (let t = 0; t < players.length; t++) {
                let other = players[t];

                if (other.canSee(player)) {
                    if (!player.sentTo[other.id] && player.id != other.id) {
                        player.sentTo[other.id] = true;
                        player.send(Packets.SERVER_TO_CLIENT.ADD_PLAYER, other.getData());
                    }

                    data.push(
                        other.sid,
                        other.x,
                        other.y,
                        other.dir,
                        other.buildIndex,
                        other.weaponIndex,
                        other.weaponVaraint,
                        null,
                        false,
                        other.skinIndex,
                        other.tailIndex,
                        0,
                        other.zIndex
                    );
                }
            }

            player.send(Packets.SERVER_TO_CLIENT.UPDATE_PLAYERS, data);
        }
    }
}, config.serverUpdateSpeed);

function sendLeaderboardData(Client) {
    let sorted = players.sort((a, b) => b.points - a.points);
    let data = [];

    for (let i = 0; i < 10; i++) {
        let player = sorted[i];

        if (player) {
            data.push(player.sid, player.name, player.points);
        }
    }

    if (Client) {
        Client.send(Packets.SERVER_TO_CLIENT.UPDATE_LEADERBOARD, data);
        return;
    }

    for (let i = 0; i < players.length; i++) {
        let player = players[i];

        if (player) player.send(Packets.SERVER_TO_CLIENT.UPDATE_LEADERBOARD, data);
    }
}

setInterval(() => {
    sendLeaderboardData();
}, 3e3);

server.on("upgrade", (request, socket, head) => {
    WebSocketServer.handleUpgrade(request, socket, head, (ws) => {
        WebSocketServer.emit("connection", ws, request);
    });
});
