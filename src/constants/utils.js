const msgpack = require("msgpack-lite");

module.exports.decodeSocketMessages = (msg) => {
    let parsed = msgpack.decode(new Uint8Array(msg));

    return [parsed[0], parsed[1]];
};

module.exports.getDistance = (x1, y1, x2, y2) => {
	return Math.sqrt((x2 -= x1) * x2 + (y2 -= y1) * y2);
};

const letters = "qwertyuiopasdfghjklzxcvbnm1234567890QWERTYUIOPASDFGHJKLZXCVBNM";

module.exports.randString = (length) => {
    let result = [];

    for (let i = 0; i < length; i++) result.push(letters[Math.floor(Math.random() * letters.length)]);

    return result.join("");
};

module.exports.randInt = (min, max) => {
    return (Math.random() * (max - min + 1)) + min;
};

module.exports.fixTo = (num, val) => {
    return parseFloat(num.toFixed(val));
};