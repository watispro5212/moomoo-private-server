const UTILS = require("../constants/utils");
const { hats, accessories } = require("../constants/store");
const config = require("../constants/config");
const msgpack = require("msgpack-lite");
const items = require("../constants/items");
const Packets = require("../constants/Packets");
const { players } = require("../../index");

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

		this.timerCount = 1e3;

        for (let i = 0; i < hats.length; i++) {
            if (hats[i].price <= 0) this.skins[hats[i].id] = 1;
        }

        for (let i = 0; i < accessories.length; i++) {
            if (accessories[i].price <= 0) this.tails[accessories[i].id] = 1;
        }
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
			this.send(
				Packets.SERVER_TO_CLIENT.UPDATE_PLAYER_VALUE,
				config.resourceTypes[i],
				1e6
			);
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

	addResource(type, amount) {
		// if (!auto && amount > 0) this.addWeaponXP(amount);
		
		this[config.resourceTypes[type]] += amount;
		this.send(
			Packets.SERVER_TO_CLIENT.UPDATE_PLAYER_VALUE,
			config.resourceTypes[type],
			this[config.resourceTypes[type]],
			1
		);
	}

	earnXP(amount) {
		if (this.age < config.maxAge) {
			this.XP += amount;

			if (this.XP >= this.maxXP) {
				if (this.age < config.maxAge) {
					this.age++;
					this.XP = 0;
					this.maxXP *= 1.2;
				} else {
					this.XP = this.maxXP;
				}
				this.upgradePoints++;
				this.send(Packets.SERVER_TO_CLIENT.UPDATE_UPGRADES, this.upgradePoints, this.upgrAge);
				this.send(Packets.SERVER_TO_CLIENT.UPDATE_AGE, this.XP, UTILS.fixTo(this.maxXP, 1), this.age);
			} else {
				this.send(Packets.SERVER_TO_CLIENT.UPDATE_AGE, this.XP);
			}
		}
	}

	gather() {
		let variant = config.fetchVariant(this);
		let variantDmg = variant.val;

		for (let i = 0; i < players.length; i++) {
			let tmpObj = players[i];

			if (tmpObj != this && tmpObj.alive) {
				let tmpDist = UTILS.getDistance(this.x, this.y, tmpObj.x, tmpObj.y) - (tmpObj.scale * 1.8);
				let wpn = items.weapons[this.weaponIndex];

				if (tmpDist <= wpn.range) {
					let tmpDir = UTILS.getDirection(tmpObj.x, tmpObj.y, this.x, this.y);

					if (UTILS.getAngleDist(tmpDir, this.dir) <= config.gatherAngle) {
						let skin = hats.find(e => e.id == this.skinIndex);
						let tail = accessories.find(e => e.id == this.tailIndex);

						let tmp = {
							skin: hats.find(e => e.id == tmpObj.skinIndex),
							tail: accessories.find(e => e.id == tmpObj.tailIndex)
						}

						let dmgMlt = variantDmg;

						if (tmpObj.weaponIndex != undefined && wpn.shield && UTILS.getAngleDist(tmpDir+Math.PI, tmpObj.dir) <= config.shieldAngle) {
							dmgMlt = wpn.shield;
						}

						let dmgVal = wpn.dmg *
							(skin && skin.dmgMultO ? skin.dmgMultO : 1) *
							(tail && tail.dmgMultO ? tail.dmgMultO : 1);

						let tmpSpd = .3 + (wpn.knock || 0);
						tmpObj.xVel += tmpSpd * Math.cos(tmpDir);
						tmpObj.yVel += tmpSpd * Math.sin(tmpDir);

						if (skin && skin.healD) {
							this.changeHealth(dmgVal * dmgMlt * tmp.skin.healD, this);
						}

						if (tail && tail.healD) {
							this.changeHealth(dmgVal * dmgMlt * tmp.tail.healD, this);
						}

						if (tmp.skin && tmp.skin.dmg) this.changeHealth(-dmgVal * tmp.skin.dmg, tmpObj);
						if (tmp.tail && tmp.tail.dmg) this.changeHealth(-dmgVal * tmp.tail.dmg, tmpObj);

						if (tmp.skin && tmp.skin.dmgK) {
							this.xVel -= tmp.skin.dmgK * Math.cos(tmpDir);
							this.yVel -= tmp.skin.dmgK * Math.sin(tmpDir);
						}

						tmpObj.changeHealth(-dmgVal * dmgMlt, this);
					}
				}
			}
		}

		for (let i = 0; i < players.length; i++) {
			let player = players[i];

			if (player == this || (this.sentTo[player.id] && this.canSee(player))) {
				player.send(Packets.SERVER_TO_CLIENT.GATHER_ANIMATION, this.sid, 0 /* hitSomething */, this.weaponIndex);
			}
		}
	}

	kill(doer) {
		if (doer && doer.alive) {
			doer.kills++;
			doer.send(Packets.SERVER_TO_CLIENT.UPDATE_PLAYER_VALUE, "kills", doer.kills, 1);
		}

		this.alive = false;
		this.send(Packets.SERVER_TO_CLIENT.KILL_PLAYER);
	}

	changeHealth(amount, doer) {
		if (amount > 0 && this.health >= this.maxHealth) return false

		let skin = hats.find(e => e.id == this.skinIndex);
		let tail = accessories.find(e => e.id == this.tailIndex);

		if (amount < 0 && skin) amount *= skin.dmgMult||1;
		if (amount < 0 && tail) amount *= tail.dmgMult || 1;
		if (amount < 0) this.hitTime = Date.now();

		this.health += amount;
		if (this.health > this.maxHealth) {
			amount -= (this.health - this.maxHealth);
			this.health = this.maxHealth;
		}

		if (this.health <= 0) this.kill(doer);

		for (let i = 0; i < players.length; i++) {
			if (this.sentTo[players[i].id] || players[i] == this) {
				players[i].send(Packets.SERVER_TO_CLIENT.UPDATE_HEALTH, this.sid, this.health);
			}
		}

		if (doer && doer.canSee(this) && !(doer == this && amount < 0)) {
			doer.send(Packets.SERVER_TO_CLIENT.SHOW_TEXT, this.x, this.y, Math.round(-amount), 1);
		}

		return true;
	}

	update(delta) {
		if (!this.alive) return;

		this.timerCount -= delta;
		if (this.timerCount <= 0) {
			let skin = hats.find(e => e.id == this.skinIndex);
			let tail = accessories.find(e => e.id == this.tailIndex);

			let regenAmount = (tail && tail.healthRegen ? tail.healthRegen : 0) + (skin && skin.healthRegen ? skin.healthRegen : 0);

			if (regenAmount) {
				this.changeHealth(regenAmount, this);
			}

			this.timerCount = 1e3;
		}

		if (this.age <= 9) this.earnXP(1e3);

		if (!this.alive) return;

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

		if (this.buildIndex == -1) {
			if (this.reloads[this.weaponIndex] > 0) {
				this.reloads[this.weaponIndex] -= delta;
			} else if (this.autoGather) {
				let done = true;
				let skin = hats.find(e => e.id == this.skinIndex);
				let wpn = items.weapons[this.weaponIndex];

				if (wpn.gather != undefined) {
					this.gather();
				} else {
					done = false;
				}

				if (done) {
					this.reloads[this.weaponIndex] = wpn.speed * (skin ? (skin.atkSpd || 1) : 1);
				}
				/*
				var worked = true;
				if (items.weapons[this.weaponIndex].gather != undefined) {
					this.gather(players);
				} else if (items.weapons[this.weaponIndex].projectile != undefined &&
					this.hasRes(items.weapons[this.weaponIndex], (this.skin?this.skin.projCost:0))) {
					this.useRes(items.weapons[this.weaponIndex], (this.skin?this.skin.projCost:0));
					this.noMovTimer = 0;
					var tmpIndx = items.weapons[this.weaponIndex].projectile;
					var projOffset = this.scale * 2;
					var aMlt = (this.skin&&this.skin.aMlt)?this.skin.aMlt:1;
					if (items.weapons[this.weaponIndex].rec) {
						this.xVel -= items.weapons[this.weaponIndex].rec * mathCOS(this.dir);
						this.yVel -= items.weapons[this.weaponIndex].rec * mathSIN(this.dir);
					}
					projectileManager.addProjectile(this.x+(projOffset*mathCOS(this.dir)),
						this.y+(projOffset*mathSIN(this.dir)), this.dir, items.projectiles[tmpIndx].range*aMlt,
						items.projectiles[tmpIndx].speed*aMlt, tmpIndx, this, null, this.zIndex);
				} else {
					worked = false;
				}
				this.gathering = this.mouseState;
				if (worked) {
					this.reloads[this.weaponIndex] = items.weapons[this.weaponIndex].speed*(this.skin?(this.skin.atkSpd||1):1);
				}
				*/
			}
		}
	}
}