const GameObject = require("./GameObject");
const { gameObjects, players } = require("../../index");
const Packets = require("../constants/Packets");
const config = require("../constants/config");
const UTILS = require("../constants/utils");

module.exports = class ObjectManager {
    static grids = {};

    static setObjectGrids(tmpObj) {
        let tmpS = 1440;
        let objX = Math.min(config.mapScale, Math.max(0, tmpObj.x));
		let objY = Math.min(config.mapScale, Math.max(0, tmpObj.y));

        for (let x = 0; x < 10; x++) {
            let tmpX = x * tmpS;

            for (let y = 0; y < 10; y++) {
                let tmpY = y * tmpS;

                if (
                    objX + tmpObj.scale >= tmpX &&
                    objX - tmpObj.scale <= tmpX + tmpS &&
					objY + tmpObj.scale >= tmpY &&
                    objY - tmpObj.scale <= tmpY + tmpS
                ) {
					if (!this.grids[x + "_" + y]) this.grids[x + "_" + y] = [];
					this.grids[x + "_" + y].push(tmpObj);
					tmpObj.gridLocations.push(x + "_" + y);
				}
            }
        }
    }

    static disableObj(tmpObj) {
        tmpObj.active = false;
        this.removeObjGrid(tmpObj);
    }

    static removeObjGrid = function(obj) {
        for (let i = 0; i < obj.gridLocations.length; i++) {
            let indx = this.grids[obj.gridLocations[i]].indexOf(obj);

            if (indx >= 0) {
                this.grids[obj.gridLocations[i]].splice(indx, 1);
            }
        }
	}

    static hitObj(tmpObj, tmpDir) {
        for (let i = 0; i < players.length; i++) {
            let player = players[i];

            if (player.active) {
                if (tmpObj.sentTo[player.id]) {
                    if (!tmpObj.active) {
                        player.send(Packets.SERVER_TO_CLIENT.KILL_OBJECT, tmpObj.sid);
                    } else if (player.canSee(tmpObj)) {
                        player.send(Packets.SERVER_TO_CLIENT.WIGGLE_GAME_OBJECT, tmpDir, tmpObj.sid);
                    }
                }
            }

            if (!tmpObj.active && tmpObj.owner == player) {
                player.changeItemCount(tmpObj.group.id, -1);
            }
        }
	}

    static checkCollision(player, other, delta) {
		delta = delta || 1;

		let dx = player.x - other.x;
		let dy = player.y - other.y;
		let tmpLen = player.scale + other.scale;

		if (Math.abs(dx) <= tmpLen || Math.abs(dy) <= tmpLen) {
			tmpLen = player.scale + (other.getScale ? other.getScale() : other.scale);

			let tmpInt = Math.sqrt(dx * dx + dy * dy) - tmpLen;

			if (tmpInt <= 0) {
				if (!other.ignoreCollision) {
					let tmpDir = UTILS.getDirection(player.x, player.y, other.x, other.y);

					if (other.isPlayer) {
						tmpInt = (tmpInt * -1) / 2;
						player.x += (tmpInt * Math.cos(tmpDir));
						player.y += (tmpInt * Math.sin(tmpDir));
						other.x -= (tmpInt * Math.cos(tmpDir));
						other.y -= (tmpInt * Math.sin(tmpDir));
					} else {
						player.x = other.x + (tmpLen * Math.cos(tmpDir));
						player.y = other.y + (tmpLen * Math.sin(tmpDir));
						player.xVel *= 0.75;
						player.yVel *= 0.75;
					}

					if (other.dmg && other.owner != player) {
						player.changeHealth(-other.dmg, other.owner, other);

						let tmpSpd = 1.5 * (other.weightM || 1);

						player.xVel += tmpSpd * Math.cos(tmpDir);
						player.yVel += tmpSpd * Math.sin(tmpDir);
					}
				} else if (other.trap && !player.noTrap && other.owner != player) {
					player.lockMove = true;
					other.hideFromEnemy = false;
				} else if (other.boostSpeed) {
					player.xVel += (delta * other.boostSpeed * (other.weightM||1)) * mathCOS(other.dir);
					player.yVel += (delta * other.boostSpeed * (other.weightM||1)) * mathSIN(other.dir);
				} else if (other.healCol) {
					player.healCol = other.healCol;
				} else if (other.teleport) {
					player.x = UTILS.randInt(0, config.mapScale);
					player.y = UTILS.randInt(0, config.mapScale);
				}

				if (other.zIndex > player.zIndex) player.zIndex = other.zIndex;

				return true;
			}
		}
		return false;
	}

    static getGridArrays(xPos, yPos, s) {
        let tmpS = 1440;
        let tmpX = Math.floor(xPos / tmpS);
		let tmpY = Math.floor(yPos / tmpS);
		let tmpArray = [];

		try {
			if (this.grids[tmpX + "_" + tmpY]) tmpArray.push(this.grids[tmpX + "_" + tmpY]);

			if (xPos + s >= (tmpX + 1) * tmpS) {
				tmpGrid = this.grids[(tmpX + 1) + "_" + tmpY];

				if (tmpGrid) tmpArray.push(tmpGrid);

				if (tmpY && yPos - s <= tmpY * tmpS) {
					tmpGrid = this.grids[(tmpX + 1) + "_" + (tmpY - 1)];

					if (tmpGrid) tmpArray.push(tmpGrid);
				} else if (yPos + s >= (tmpY + 1) * tmpS) {
					tmpGrid = this.grids[(tmpX + 1) + "_" + (tmpY + 1)];

					if (tmpGrid) tmpArray.push(tmpGrid);
				}
			}
            
            if (tmpX && xPos - s <= tmpX * tmpS) {
				tmpGrid = this.grids[(tmpX - 1) + "_" + tmpY];

				if (tmpGrid) tmpArray.push(tmpGrid);

				if (tmpY && yPos - s <= tmpY * tmpS) {
					tmpGrid = this.grids[(tmpX - 1) + "_" + (tmpY - 1)];

					if (tmpGrid) tmpArray.push(tmpGrid);
				} else if (yPos + s >= (tmpY + 1) * tmpS) {
					tmpGrid = this.grids[(tmpX - 1) + "_" + (tmpY + 1)];

					if (tmpGrid) tmpArray.push(tmpGrid);
				}
			}
            
            if (yPos + s >= (tmpY + 1) * tmpS) {
				tmpGrid = this.grids[tmpX + "_" + (tmpY + 1)];

				if (tmpGrid) tmpArray.push(tmpGrid);
			}
            
            if (tmpY && yPos - s <= tmpY * tmpS) {
				tmpGrid = this.grids[tmpX + "_" + (tmpY - 1)];

				if (tmpGrid) tmpArray.push(tmpGrid);
			}
		} catch (e) {}

		return tmpArray;
    }

    static checkItem(x, y, s, sM, indx, ignoreWater, placer) {
        for (let i = 0; i < gameObjects.length; i++) {
            let tmpObj = gameObjects[i];

            if (tmpObj.active) {
                let blockS = tmpObj.blocker ? tmpObj.blocker : tmpObj.getScale(sM, tmpObj.isItem);

                if (UTILS.getDistance(x, y, tmpObj.x, tmpObj.y) < s + blockS) {
                    return false;
                }
            }
        }

        if (!ignoreWater && indx != 18 && y >= (config.mapScale / 2) - (config.riverWidth / 2) && y <= (config.mapScale / 2) + (config.riverWidth / 2)) {
            return false;
        }

        return true;
    }

    static add(sid, x, y, dir, s, type, data, setSID, owner) {
        let tmpObj;

        for (let i = 0; i < gameObjects.length; i++) {
            let obj = gameObjects[i];

            if (obj.sid == sid) {
                tmpObj = obj;
                break;
            }
        }

        if (!tmpObj) {
            for (let i = 0; i < gameObjects.length; i++) {
                if (!gameObjects[i].active) {
                    tmpObj = gameObjects[i];
                    break;
                }
            }
        }

        if (!tmpObj) {
            tmpObj = new GameObject(sid);
            gameObjects.push(tmpObj);
        }

        if (setSID) tmpObj.sid = sid;

        tmpObj.init(x, y, dir, s, type, data, owner);
        this.setObjectGrids(tmpObj);
    }
}