const GameObject = require("./GameObject");
const { gameObjects } = require("../../index");

module.exports = class ObjectManager {
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

        if (setSID) UTILS.objectsMaps.sidToObject.set(sid, tmpObj);
        if (setSID) tmpObj.sid = sid;

        tmpObj.init(x, y, dir, s, type, data, owner);
    }
}