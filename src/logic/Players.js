const UTILS = require("../constants/utils");
const { hats, accessories } = require("../constants/store");
const config = require("../constants/config");
const msgpack = require("msgpack-lite");
const items = require("../constants/items");

var playerSIDS = 0;

module.exports = class Player {
    constructor(ws) {
        this.ws = ws;

        this.sid = playerSIDS++;
        this.id = UTILS.randString(7);

        this.team = null;
        this.skinIndex = 0;
        this.tailIndex = 0;
        this.tails = {};
        this.skins = {};

        this.itemCounts = {};
        this.isPlayer = true;
        this.moveDir = undefined;
        this.skinColor = 0;

        for (let i = 0; i < hats.length; i++) {
            if (hats[i].price <= 0) this.skins[hats[i].id] = 1;
        }

        for (let i = 0; i < accessories.length; i++) {
            if (accessories[i].price <= 0) this.tails[accessories[i].id] = 1;
        }

        this.resetResources();
    }

    send(type) {
        let data = Array.prototype.slice.call(arguments, 1);
        let binary = msgpack.encode([type, data]);

        this.ws.send(binary);
    }

    resetMoveDir() {
		this.moveDir = undefined;
	}

	canSee(other) {
		if (!other) return false;

		let dx = Math.abs(other.x - this.x) - other.scale;
		let dy = Math.abs(other.y - this.y) - other.scale;

		return dx <= (config.maxScreenWidth / 2) * 1.3 && dy <= (config.maxScreenHeight / 2) * 1.3;
	}

    resetResources() {
		for (let i = 0; i < config.resourceTypes.length; ++i) {
			this[config.resourceTypes[i]] = 1e6;
		}
	}

    spawn() {
        this.active = true;
		this.alive = true;
		this.lockMove = false;
		this.lockDir = false;
		this.minimapCounter = 0;
		this.chatCountdown = 0;
		this.shameCount = 0;
		this.shameTimer = 0;
		this.sentTo = {};
		this.gathering = 0;
		this.autoGather = 0;
		this.mouseState = 0;
		this.buildIndex = -1;
		this.weaponIndex = 0;
		this.dmgOverTime = {};
		this.noMovTimer = 0;
		this.maxXP = 300;
		this.XP = 0;
		this.age = 1;
		this.kills = 0;
		this.upgrAge = 2;
		this.upgradePoints = 0;

		this.weaponVaraint = 0;

		this.x = UTILS.randInt(0, config.mapScale);
		this.y = UTILS.randInt(0, config.mapScale);

		this.zIndex = 0;
		this.xVel = 0;
		this.yVel = 0;
		this.slowMult = 1;
		this.dir = 0;
		this.targetDir = 0;
		this.targetAngle = 0;
		this.maxHealth = 100;
		this.health = this.maxHealth;
		this.scale = config.playerScale;
		this.speed = config.playerSpeed;

		this.resetMoveDir();
		this.resetResources();

		this.items = [0, 3, 6, 10];
		this.weapons = [0];
		this.shootCount = 0;
		this.weaponXP = [];
		this.reloads = {};
    }

    setUserData(data) {
        if (data) {
            this.name = data.name;
            this.skinColor = config.skinColors[data.skin];
        }
    }

	getData() {
		return [
			this.id,
			this.sid,
			this.name,
			UTILS.fixTo(this.x, 2),
			UTILS.fixTo(this.y, 2),
			UTILS.fixTo(this.dir, 3),
			this.health,
			this.maxHealth,
			this.scale,
			this.skinColor
		];
	}

	update(delta) {
		if (this.lockMove) {
			this.xVel = 0;
			this.yVel = 0;
		} else {
			let wpn = items.weapons[this.weaponIndex];
			let skin = hats.find(e => e.id == this.skinIndex);
			let tail = accessories.find(e => e.id == this.skinIndex);

			let spdMult = (this.buildIndex >= 0 ? .5 : 1) * (wpn.spdMult || 1) *
				(skin ? (skin.spdMult || 1) : 1) *
				(tail ? (tail.spdMult || 1) : 1);

			let xVel = this.moveDir != undefined ? Math.cos(this.moveDir) : 0;
			let yVel = this.moveDir != undefined ? Math.sin(this.moveDir) : 0;

			let length = Math.sqrt(xVel * xVel + yVel * yVel);

			if (length != 0) {
				xVel /= length;
				yVel /= length;
			}

			if (xVel) this.xVel += xVel * this.speed * spdMult * delta;
			if (yVel) this.yVel += yVel * this.speed * spdMult * delta;
		}

		let tmpSpeed = UTILS.getDistance(0, 0, this.xVel * delta, this.yVel * delta);
		let depth = Math.min(4, Math.max(1, Math.round(tmpSpeed / 40)));
		let tMlt = 1 / depth;

		for (let i = 0; i < depth; i++) {
			if (this.xVel) this.x += (this.xVel * delta) * tMlt;
			if (this.yVel) this.y += (this.yVel * delta) * tMlt;
		}

		if (this.xVel) {
			this.xVel *= Math.pow(config.playerDecel, delta);
			if (this.xVel <= 0.01 && this.xVel >= -0.01) this.xVel = 0;
		}
		
		if (this.yVel) {
			this.yVel *= Math.pow(config.playerDecel, delta);
			if (this.yVel <= 0.01 && this.yVel >= -0.01) this.yVel = 0;
		}

		if (this.x - this.scale < 0) {
			this.x = this.scale;
		} else if (this.x + this.scale > config.mapScale) {
			this.x = config.mapScale - this.scale;
		}
		
		if (this.y - this.scale < 0) {
			this.y = this.scale;
		} else if (this.y + this.scale > config.mapScale) {
			this.y = config.mapScale - this.scale;
		}
	}
}