import items from "../constants/items.js";
import Projectile from "./Projectile.js";
import { projectiles } from "../../index.js";
import Player from "./Players.js";

export default class ProjectileManager {

	/**
	 * @param {number} x 
	 * @param {number} y 
	 * @param {number} dir 
	 * @param {number} range 
	 * @param {number} speed 
	 * @param {number} indx 
	 * @param {Player} owner 
	 * @param {boolean | number} ignoreObj 
	 * @param {number} layer 
	 * @returns {Projectile}
	 */

	static addProjectile(x, y, dir, range, speed, indx, owner, ignoreObj, layer) {
		let tmpData = items.projectiles[indx];
		let tmpProj;

		for (var i = 0; i < projectiles.length; ++i) {
			if (!projectiles[i].active) {
				tmpProj = projectiles[i];
				break;
			}
		}

		if (!tmpProj) {
			tmpProj = new Projectile();
			tmpProj.sid = projectiles.length;
			projectiles.push(tmpProj);
		}

		tmpProj.init(indx, x, y, dir, speed, tmpData.dmg, range, tmpData.scale, owner);
		tmpProj.ignoreObj = ignoreObj;
		tmpProj.layer = layer || tmpData.layer;

		return tmpProj;
	}
}