import { players } from "../../index.js";
import UTILS from "../constants/utils.js";
import items from "../constants/items.js";
import ProjectileManager from "./ProjectileManager.js";
import Packets from "../constants/Packets.js";

export default class GameObject {
    constructor(sid) {
        this.sid = sid;
    }

    init(x, y, dir, scale, type, data, owner) {
        data = data || {};

        this.sentTo = {};
        this.gridLocations = [];
        this.active = true;
        this.doUpdate = data.doUpdate;
        this.x = x;
        this.y = y;
        this.dir = dir;
        this.scale = scale;
        this.type = type;
        this.id = data.id;
        this.owner = owner;
        this.name = data.name;
        this.isItem = (this.id != undefined);
        this.group = data.group;
        this.health = data.health;
        this.currentHealth = this.health;
        this.layer = 2;
        if (this.group != undefined) {
            this.layer = this.group.layer;
        } else if (this.type == 0) {
            this.layer = 3;
        } else if (this.type == 2) {
            this.layer = 0;
        } else if (this.type == 4) {
            this.layer = -1;
        }
        this.colDiv = data.colDiv || 1;
        this.turretReload = 2200;
        this.blocker = data.blocker;
        this.ignoreCollision = data.ignoreCollision;
        this.dontGather = data.dontGather;
        this.hideFromEnemy = data.hideFromEnemy;
        this.friction = data.friction;
        this.projDmg = data.projDmg;
        this.dmg = data.dmg;
        this.pDmg = data.pDmg;
        this.pps = data.pps;
        this.zIndex = data.zIndex || 0;
        this.turnSpeed = data.turnSpeed;
        this.req = data.req;
        this.trap = data.trap;
        this.healCol = data.healCol;
        this.teleport = data.teleport;
        this.boostSpeed = data.boostSpeed;
        this.projectile = data.projectile;
        this.shootRange = data.shootRange;
        this.shootRate = data.shootRate;
        this.shootCount = this.shootRate;
        this.spawnPoint = data.spawnPoint;
    }

    visibleToPlayer(player) {
		return !(this.hideFromEnemy) || (this.owner && this.owner == player);
	}

    getScale(sM, ig) {
        sM = sM || 1;
        return this.scale * ((this.isItem || this.type == 2 || this.type == 3 || this.type == 4) ? 1 : (0.6 * sM)) * (ig ? 1 : this.colDiv);
    }

    changeHealth(amount, doer) {
        this.health += amount;
    }

    update(delta) {
        if (this.active) {
            if (this.name == "turret") {
                this.turretReload -= delta;

                if (this.turretReload <= 0) {
                    this.turretReload = 2200;

                    let target = players
                    .filter(e => e.alive && e.health > 0 && e != this.owner && UTILS.getDistance(this.x, this.y, e.x, e.y) <= 700)
                    .sort((a, b) => UTILS.getDistance(this.x, this.y, a.x, a.y) - UTILS.getDistance(this.x, this.y, b.x, b.y))[0];

                    if (target) {
                        let proj = items.projectiles[1];
                        let dir = UTILS.getDir(target, this);

                        this.dir = dir;

                        for (let i = 0; i < players.length; i++) {
                            let player = players[i];

                            if (this.sentTo[player.id]) {
                                player.send(Packets.SERVER_TO_CLIENT.SHOOT_TURRET, this.sid, dir);
                            }
                        }

                        ProjectileManager.addProjectile(
                            this.x + Math.cos(dir) * (this.scale + 20),
                            this.y + Math.sin(dir) * (this.scale + 20),
                            dir,
                            proj.range,
                            proj.speed,
                            1,
                            this.owner,
                            null,
                            this.owner.zIndex
                        );
                    }
                }
            }
        }
    }
}