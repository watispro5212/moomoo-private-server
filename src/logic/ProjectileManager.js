const items = require("../constants/items");
const Projectile = require("./Projectile");
const { projectiles } = require("../../index");

module.exports = class ProjectileManager {
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