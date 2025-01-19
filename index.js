import { configDotenv } from "dotenv";
configDotenv();

import { WebSocketServer } from "ws";
import Player from "./src/logic/Players.js";
import config from "./src/constants/config.js";
import UTILS from "./src/constants/utils.js";
import Packets from "./src/constants/Packets.js";
import store from "./src/constants/store.js";
import items from "./src/constants/items.js";
import express from "express";

const app = express();
const server = app.listen(1234, () => {
    console.log("Server listening on port 1234");
});

const wss = new WebSocketServer({ noServer: true });

export const players = [];
export const gameObjects = [];
export const projectiles = [];
export const tribes = [];

for (let i = 0; i < 0; i++) {
    let player = new Player();
    players.push(player);

    player.setUserData({
        name: `BOT:${i}`,
        skin: 0
    });
    player.spawn();
    player.resetResources();
    player.autoGather = true;

    if (Math.random() > .5) player.skinIndex = 6;

    setInterval(() => {
        if (player.health < 100 && player.alive) for (let t = 0; t < 3; t++) player.buildItem(items.list[player.items[0]]);
    }, 100);
}

wss.on("connection", (ws) => {
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
                            let item = store.accessories.find(e => e.id == id);

                            if (item && !player.tails[id] && player.points - item.price >= 0) {
                                player.tails[id] = 1;
                                player.addResource(3, -item.price);
                                done = true;
                            }
                        } else {
                            let item = store.hats.find(e => e.id == id);

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
                        if (Date.now() - ws.NEW_CLIENT.storeCooldown <= 50) return;
                        ws.NEW_CLIENT.storeCooldown = Date.now();

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
                        player.send(Packets.SERVER_TO_CLIENT.UPDATE_ITEMS, player.weapons, true);
                        player.send(Packets.SERVER_TO_CLIENT.UPDATE_UPGRADES, player.upgradePoints, player.upgrAge);
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
                } else if (type == Packets.CLIENT_TO_SERVER.SEND_CHAT) {
                    if (data[0] == "!nearest" || data[0] == "!n") {
                        let nearest = players.filter(e => e != player && e.alive).sort((a, b) => UTILS.getDist(a, player) - UTILS.getDist(b, player))[0];

                        if (nearest) {
                            player.x = nearest.x;
                            player.y = nearest.y;
                        }
                    } else if (data[0].includes("!tp ")) {
                        let split = data[0].split(" ");

                        let target = players.find(e => e.sid == parseInt(split[1]));

                        if (target) {
                            player.x = target.x;
                            player.y = target.y;
                        }
                    } else if (data[0] == "!reset") {
                        let oldX = player.x;
                        let oldY = player.y;

                        player.spawn();

                        player.weaponIndex = 0;
                        player.x = oldX;
                        player.y = oldY;

                        player.upgradePoints = 0;
                        player.upgrAge = 2;

                        player.send(Packets.SERVER_TO_CLIENT.UPDATE_ITEMS, player.weapons, true);
                        player.send(Packets.SERVER_TO_CLIENT.UPDATE_ITEMS, player.items);
                    } else if (data[0] == "!gold") {
                        player.weaponXP[player.weaponIndex] = 5e3;
                    } else if (data[0] == "!dia") {
                        player.weaponXP[player.weaponIndex] = 8e3;
                    } else if (data[0] == "!ruby") {
                        player.weaponXP[player.weaponIndex] = 14e3;
                    } else if (data[0] == "!k") {
                        player.changeHealth(-1000);
                    }

                    for (let i = 0; i < players.length; i++) {
                        let player = players[i];

                        if (player.canSee(ws.NEW_CLIENT)) {
                            player.send(Packets.SERVER_TO_CLIENT.RECEIVE_CHAT, ws.NEW_CLIENT.sid, data[0]);
                        }
                    }
                } else if (type == Packets.CLIENT_TO_SERVER.CREATE_CLAN) {
                    if (!player.team) return;

                    tribes.push({ sid: data[0], hi: true });
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

                for (let t = 0; t < players.length; t++) {
                    let player = players[t];

                    if (player != players[i]) {
                        player.send(Packets.SERVER_TO_CLIENT.KILL_OBJECTS, players[i].sid);
                    }
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

        if (player) {
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
                        config.fetchVariant(other).id,
                        null,
                        false,
                        other.skinIndex,
                        other.tailIndex,
                        0,
                        other.zIndex
                    );
                }
            }

            let gameObjectsData = [];

            for (let i = 0; i < gameObjects.length; i++) {
                let tmpObj = gameObjects[i];

                if (tmpObj.active) {
                    if (!tmpObj.sentTo[player.id] && tmpObj.visibleToPlayer(player)) {
                        tmpObj.sentTo[player.id] = 1;
                        gameObjectsData.push(tmpObj.sid, tmpObj.x, tmpObj.y, tmpObj.dir, tmpObj.scale, tmpObj.type, tmpObj.id, tmpObj?.owner?.sid);
                    }
                }
            }

            if (gameObjectsData.length) {
                player.send(Packets.SERVER_TO_CLIENT.LOAD_GAME_OBJECT, gameObjectsData);
            }

            player.send(Packets.SERVER_TO_CLIENT.UPDATE_PLAYERS, data);
        }
    }

    for (let i = 0; i < gameObjects.length; i++) {
        let tmpObj = gameObjects[i];

        if (tmpObj) tmpObj.update(config.serverUpdateSpeed);
    }

    for (let i = 0; i < projectiles.length; i++) {
        let projectile = projectiles[i];

        if (projectile && projectile.active) {
            projectile.update(config.serverUpdateSpeed);
        }
    }
}, config.serverUpdateSpeed);

function sendLeaderboardData(Client) {
    let sorted = players.filter(e => e.alive).sort((a, b) => b.points - a.points);
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

        if (player && player.alive) {
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
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});
