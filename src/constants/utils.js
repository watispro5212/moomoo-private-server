const msgpack = require("msgpack-lite");

module.exports.decodeSocketMessages = (msg) => {
    let parsed = msgpack.decode(new Uint8Array(msg));

    return [parsed[0], parsed[1]];
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