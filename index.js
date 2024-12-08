require("dotenv").config();

const express = require("express");
const WebSocket = require("ws");

const app = express();
const server = app.listen(1234, () => {
    console.log("Server listening on port 1234");
});

const WebSocketServer = new WebSocket.WebSocketServer({ noServer: true });

const players = [];
const gameObjects = [];

module.exports.players = players;
module.exports.gameObjects = gameObjects;

const Player = require("./src/logic/Players");
const config = require("./src/constants/config");
const UTILS = require("./src/constants/utils");
const Packets = require("./src/constants/Packets");
const { hats, accessories } = require("./src/constants/store");
const items = require("./src/constants/items");

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
                player.resetResources();
                sendLeaderboardData(player);
            } else if (ws.NEW_CLIENT) {
                let player = ws.NEW_CLIENT;

                if (type == Packets.CLIENT_TO_SERVER.PING_SOCKET) {
                    player.send(Packets.SERVER_TO_CLIENT.PING_SOCKET);
                } else if (type == Packets.CLIENT_TO_SERVER.MOVE) {
                    player.moveDir = data[0];
                } else if (type == Packets.CLIENT_TO_SERVER.STORE) {
                    let [buy, id, indx] = data;
                    let done = false;

                    if (buy) {
                        if (indx) {
                            let item = accessories.find(e => e.id == id);

                            if (item && !player.tails[id] && player.points - item.price >= 0) {
                                player.tails[id] = 1;
                                player.addResource(3, -item.price);
                                done = true;
                            }
                        } else {
                            let item = hats.find(e => e.id == id);
                            
                            if (item && !player.skins[id] && player.points - item.price >= 0) {
                                player.skins[id] = 1;
                                player.addResource(3, -item.price);
                                done = true;
                            }
                        }

                        if (done) {
                            player.send(
                                Packets.SERVER_TO_CLIENT.UPDATE_STORE_ITEMS,
                                0,
                                id,
                                indx
                            );
                        }
                    } else {
                        if (indx) {
                            if (player.tails[id]) {
                                player.tailIndex = id;
                                done = true;
                            }
                        } else {
                            if (player.skins[id]) {
                                player.skinIndex = id;
                                done = true;
                            }
                        }

                        if (done) {
                            player.send(
                                Packets.SERVER_TO_CLIENT.UPDATE_STORE_ITEMS,
                                1,
                                id,
                                indx
                            );
                        }
                    }
                } else if (type == Packets.CLIENT_TO_SERVER.AUTO_GATHER) {
                    player.autoGather = !player.autoGather;
                } else if (type == Packets.CLIENT_TO_SERVER.SEND_AIM) {
                    player.dir = data[0];
                } else if (type == Packets.CLIENT_TO_SERVER.SEND_UPGRADE) {
                    if (player.upgradePoints <= 0) return;

                    if (data[0] < 16) {
                        if (data[0] < 9) {
                            player.weapons[0] = data[0];

                            if (player.weaponIndex < 9) {
                                player.weaponIndex = data[0];
                            }
                        } else {
                            player.weapons[1] = data[0];

                            if (player.weaponIndex >= 9) {
                                player.weaponIndex = data[0];
                            }
                        }

                        player.upgradePoints--;
                        player.upgrAge++;
                        player.send(Packets.SERVER_TO_CLIENT.UPDATE_UPGRADES, player.upgradePoints, player.upgrAge);
                        player.send(Packets.SERVER_TO_CLIENT.UPDATE_ITEMS, player.weapons, true);
                    } else {
                        let id = data[0] - 16;
                        let item = items.list[id];

                        if (item) {
                            if (item.group) {
                                let groupId = 0;

                                if (item.group.name == "food") groupId = 0;
                                if (item.group.name == "walls") groupId = 1;
                                if (item.group.name == "spikes") groupId = 2;
                                if (item.group.name == "mill") groupId = 3;
                                if (item.group.name == "trap" || item.group.name == "booster") groupId = 4;
                                if (["turret", "blocker", "teleporter", "watchtower"].includes(item.group.name)) groupId = 5;

                                player.items[groupId] = id;
                            }

                            player.upgradePoints--;
                            player.upgrAge++;
                            player.send(Packets.SERVER_TO_CLIENT.UPDATE_UPGRADES, player.upgradePoints, player.upgrAge);
                            player.send(Packets.SERVER_TO_CLIENT.UPDATE_ITEMS, player.items);
                        }
                    }
                } else if (type == Packets.CLIENT_TO_SERVER.SELECT_TO_BUILD) {
                    if (!data[1]) {
                        if (player.buildIndex == data[0]) {
                            player.buildIndex = -1;
                        } else {
                            player.buildIndex = data[0];
                        }
                    } else {
                        player.buildIndex = -1;
                        player.weaponIndex = data[0];
                    }
                } else if (type == Packets.CLIENT_TO_SERVER.SEND_HIT) {
                    if (data[1] == null || data[1] == undefined) data[1] = 0;

                    player.dir = data[1];

                    if (data[0]) {
                        if (player.buildIndex >= 0) {
                            player.buildItem(items.list[player.buildIndex]);
                        } else {
                            player.mouseState = 1;
                        }
                    } else {
                        player.mouseState = 0;
                    }
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

            let indx = players.findIndex(e => e.id == CLIENT_ID);
            players.splice(indx, 1);
            sendLeaderboardData();
        }
    });
});

setInterval(() => {
    for (let i = 0; i < players.length; i++) {
        let player = players[i];

        if (player && player.alive) {
            player.update(config.serverUpdateSpeed);

            let data = [];

            for (let t = 0; t < players.length; t++) {
                let other = players[t];

                if (other.canSee(player) && other.alive) {
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

function sendMinimapData() {
    let data = [];

    for (let i = 0; i < players.length; i++) {
        let player = players[i];

        if (player) {
            data.push(player.x, player.y);
        }
    }

    for (let i = 0; i < players.length; i++) {
        let player = players[i];

        if (player) player.send(Packets.SERVER_TO_CLIENT.UPDATE_MINIMAP, data);
    }
}

setInterval(() => {
    sendLeaderboardData();
    sendMinimapData();
}, 3e3);

server.on("upgrade", (request, socket, head) => {
    WebSocketServer.handleUpgrade(request, socket, head, (ws) => {
        WebSocketServer.emit("connection", ws, request);
    });
});
