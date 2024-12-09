const { players } = require("../../index");
const Packets = require("../constants/Packets");
const ObjectManager = require("./ObjectManager");
const items = require("../constants/items");
const config = require("../constants/config");
const UTILS = require("../constants/utils");

module.exports = class projectile {
    init(indx, x, y, dir, spd, dmg, rng, scl, owner) {
        this.active = true;
        this.indx = indx;
        this.x = x;
        this.y = y;
        this.oldX = x;
        this.oldY = y;
        this.dir = dir;
        this.skipMov = true;
        this.speed = spd;
        this.dmg = dmg;
        this.scale = scl;
        this.range = rng;
        this.owner = owner;
        this.sentTo = {};
    }

    update(delta) {
        let tmpSpeed = this.speed * delta;

        if (!this.skipMov) {
            this.x += tmpSpeed * Math.cos(this.dir);
            this.y += tmpSpeed * Math.sin(this.dir);
            this.range -= tmpSpeed;

            if (this.range <= 0) {
                this.x += this.range * Math.cos(this.dir);
                this.y += this.range * Math.sin(this.dir);
                tmpSpeed = 1;
                this.range = 0;
                this.active = false;
            }
        } else {
            this.skipMov = false;
        }

        for (let i = 0; i < players.length; i++) {
            let player = players[i];

            if (!this.sentTo[player.id] && player.canSee(this)) {
                this.sentTo[player.id] = 1;

                player.send(Packets.SERVER_TO_CLIENT.ADD_PROJ, this.x, this.y, this.dir, this.range, this.speed, this.indx, this.layer, this.sid);
            }
        }

        let objectsHit = [];

        for (let i = 0; i < players.length; i++) {
            let tmpObj = players[i];

            if (tmpObj.alive && this.owner != tmpObj) {
                if (UTILS.lineInRect(
                    tmpObj.x - tmpObj.scale,
                    tmpObj.y - tmpObj.scale,
                    tmpObj.x + tmpObj.scale,
                    tmpObj.y + tmpObj.scale,
                    this.x,
                    this.y,
                    this.x + (tmpSpeed * Math.cos(this.dir)),
                    this.y + (tmpSpeed * Math.sin(this.dir)))
                ) {
                    objectsHit.push(tmpObj);
                }
            }
        }

        let tmpList = ObjectManager.getGridArrays(this.x, this.y, this.scale);

        for (let x = 0; x < tmpList.length; x++) {
            for (let y = 0; y < tmpList[x].length; y++) {
                let tmpObj = tmpList[x][y];
                let tmpScale = tmpObj.getScale();

                if (tmpObj.active && !(this.ignoreObj == tmpObj.sid) && (this.layer <= tmpObj.layer) && objectsHit.indexOf(tmpObj) < 0 && !tmpObj.ignoreCollision) {
                    if (UTILS.lineInRect(
                        tmpObj.x - tmpScale,
                        tmpObj.y - tmpScale,
                        tmpObj.x + tmpScale,
                        tmpObj.y + tmpScale,
                        this.x,
                        this.y,
                        this.x + (tmpSpeed * Math.cos(this.dir)),
                        this.y + (tmpSpeed * Math.sin(this.dir)))
                    ) {
                        objectsHit.push(tmpObj);
                    }
                }
            }
        }

        if (objectsHit.length > 0) {
            let hitObj = null;
            let shortDist = null;

            for (let i = 0; i < objectsHit.length; i++) {
                let tmpDist = UTILS.getDistance(this.x, this.y, objectsHit[i].x, objectsHit[i].y);

                if (shortDist == null || tmpDist < shortDist) {
                    shortDist = tmpDist;
                    hitObj = objectsHit[i];
                }
            }

            if (hitObj.isPlayer) {
                hitObj.xVel += .3 * Math.cos(this.dir);
                hitObj.yVel += .3 * Math.sin(this.dir);

                let wpn = items.weapons[hitObj.weaponIndex];

                if (hitObj.weaponIndex == undefined || !(wpn.shield && UTILS.getAngleDist(this.dir + Math.PI, hitObj.dir) <= config.shieldAngle)) {
                    hitObj.changeHealth(-this.dmg, this.owner);
                }
            } else {
                if (hitObj.projDmg && hitObj.health) {
                    hitObj.changeHealth(-this.dmg)

                    if (hitObj.health <= 0) {
                        ObjectManager.disableObj(hitObj);
                    }
                }

                for (let i = 0; i < players.length; i++) {
                    let player = players[i];

                    if (player.active) {
                        if (hitObj.sentTo[player.id]) {
                            if (hitObj.active) {
                                if (player.canSee(hitObj)) {
                                    player.send(Packets.SERVER_TO_CLIENT.WIGGLE_GAME_OBJECT, this.dir, hitObj.sid);
                                }
                            } else {
                                player.send(Packets.SERVER_TO_CLIENT.KILL_OBJECT, hitObj.sid);
                            }
                        }

                        if (!hitObj.active && hitObj.owner == player) player.changeItemCount(hitObj.group.id, -1);
                    }
                }
            }

            this.active = false;

            for (let i = 0; i < players.length; i++) {
                let player = players[i];

                if (this.sentTo[player.id]) {
                    player.send(Packets.SERVER_TO_CLIENT.REM_PROJ, this.sid, UTILS.fixTo(shortDist, 1));
                }
            }
        }
    }
}