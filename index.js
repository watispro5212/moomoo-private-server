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
import GameObject from "./src/logic/GameObject.js";
import projectile from "./src/logic/Projectile.js";
import ObjectManager from "./src/logic/ObjectManager.js";

const app = express();
app.get("/", (req, res) => {
    res.send("<h1>Lotus Private Server</h1><p>The server is running on port 1234.</p><p>Connect via WebSocket to start playing.</p>");
});
const server = app.listen(1234, () => {
    console.log("Server listening on port 1234");
});

const wss = new WebSocketServer({ noServer: true });

/** @type {Player[]} */

export const players = [];

/** @type {GameObject[]} */

export const gameObjects = [];

/** @type {projectile[]} */

export const projectiles = [];

export const tribes = [];

function spawn(x, y, amount, healing, soldier, move) {
    for (let i = 0; i < amount; i++) {
        let player = new Player();
        players.push(player);

        player.setUserData({
            name: `BOT:${i}`,
            skin: 0
        });

        player.spawn();
        player.resetResources();

        player.x = UTILS.randInt(x - 500, x + 500);
        player.y = UTILS.randInt(y - 500, y + 500);

        player.isAI = true;
        player.weaponIndex = 5;

        if (soldier) player.skinIndex = 6;

        if (move) {
            player.moveDir = 0;

            setInterval(() => {
                player.moveDir = player.moveDir === 0 ? -Math.PI : 0;
            }, 1500);
        }

        if (healing) {
            setInterval(() => {
                if (player.health < 100 && player.alive) {
                    for (let t = 0; t < 2; t++) player.buildItem(items.list[player.items[0]]);
                }
            }, 50);
        }
    }
}

wss.on("connection", (ws) => {
    console.log("new client");

    ws.on("message", (msg) => {
        ws.binaryType = "arraybuffer";

        setTimeout(() => {
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
                        } else if (data[0] === "!kms") {
                            const spike = items.list[9];
                            const trap = items.list[15];

                            ObjectManager.add(
                                gameObjects.length,
                                player.x,
                                player.y + 35,
                                0,
                                trap.scale,
                                trap.type,
                                trap,
                                false
                            );

                            ObjectManager.add(
                                gameObjects.length,
                                player.x,
                                player.y - (50 + spike.scale - 35),
                                0,
                                spike.scale,
                                spike.type,
                                spike,
                                false
                            );
                        } else if (data[0].includes("!tp ")) {
                            let split = data[0].split(" ");

                            let target = players.find(e => e.sid == parseInt(split[1]));

                            if (target) {
                                player.x = target.x;
                                player.y = target.y;
                            }
                        } else if (data[0] == "!reset" || data[0] == "!re") {
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
                        } else if (data[0] == "!gold" || data[0] == "!g") {
                            player.weaponXP[player.weaponIndex] = 5e3;
                        } else if (data[0] == "!dia" || data[0] == "!d") {
                            player.weaponXP[player.weaponIndex] = 8e3;
                        } else if (data[0] == "!ruby" || data[0] == "!r") {
                            player.weaponXP[player.weaponIndex] = 14e3;
                        } else if (data[0] == "!k") {
                            player.kill();
                        } else if (data[0] === "!s") {
                            spawn(
                                player.x,
                                player.y,
                                1,
                                false,
                                false
                            );
                        } else if (data[0] === "!s50") {
                            spawn(
                                player.x,
                                player.y,
                                50,
                                false,
                                false
                            );
                        } else if (data[0] === "!ss") {
                            spawn(
                                player.x,
                                player.y,
                                1,
                                false,
                                true
                            );
                        } else if (data[0] === "!sh") {
                            spawn(
                                player.x,
                                player.y,
                                1,
                                true,
                                false
                            );
                        } else if (data[0] === "!ssh") {
                            spawn(
                                player.x,
                                player.y,
                                1,
                                true,
                                true
                            );
                        } else if (data[0] === "!sm") {
                            spawn(
                                player.x,
                                player.y,
                                1,
                                false,
                                false,
                                true
                            );
                        } else if (data[0] === "!ssm") {
                            spawn(
                                player.x,
                                player.y,
                                1,
                                false,
                                true,
                                true
                            );
                        } else if (data[0] === "!ssmh") {
                            spawn(
                                player.x,
                                player.y,
                                1,
                                true,
                                true,
                                true
                            );
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
        }, 15);
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

            for (let i = 0; i < gameObjects.length; i++) {
                if (gameObjects[i].owner === ws.NEW_CLIENT) {
                    gameObjects[i].active = false;
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

    for (let i = 0; i < players.length; i++) {
        let player = players[i];

        if (player && !player.alive && player.isAI) {
            players.splice(i, 1);
            i--;
        }
    }

    for (let i = 0; i < players.length; i++) {
        let player = players[i];

        if (player) {
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
