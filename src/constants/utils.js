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

module.exports.getAngleDist = (a, b) => {
	let p = Math.abs(b - a) % (Math.PI * 2);
	return (p > Math.PI ? (Math.PI * 2) - p : p);
};

module.exports.getDirection = (x1, y1, x2, y2) => {
	return Math.atan2(y1 - y2, x1 - x2);
};

module.exports.lineInRect = (recX, recY, recX2, recY2, x1, y1, x2, y2) => {
	let minX = x1;
	let maxX = x2;

	if (x1 > x2) {
		minX = x2;
		maxX = x1;
	}
	if (maxX > recX2) maxX = recX2;
	if (minX < recX) minX = recX;
	if (minX > maxX) return false;

	let minY = y1;
	let maxY = y2;
	let dx = x2 - x1;

	if (Math.abs(dx) > 0.0000001) {
		let a = (y2 - y1) / dx;
		let b = y1 - a * x1;
		minY = a * minX + b;
		maxY = a * maxX + b;
	}

	if (minY > maxY) {
		let tmp = maxY;
		maxY = minY;
		minY = tmp;
	}

	if (maxY > recY2) maxY = recY2;
	if (minY < recY) minY = recY;
	if (minY > maxY) return false;

	return true;
};

module.exports.getDist = (a, b) => {
	return Math.hypot(a.y - b.y, a.x - b.x);
};

module.exports.getDir = (a, b) => {
	return Math.atan2(a.y - b.y, a.x - b.x);
};