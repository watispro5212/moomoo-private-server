const UTILS = require("../constants/utils");
const { hats, accessories } = require("../constants/store");
const config = require("../constants/config");

var playerSIDS = 0;

module.exports = class Player {
    constructor() {
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

    resetMoveDir() {
		this.moveDir = undefined;
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
		this.resetResources(moofoll);

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
}