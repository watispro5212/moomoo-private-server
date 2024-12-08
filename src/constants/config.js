module.exports = {
    serverUpdateRate: 9,
    serverUpdateSpeed: 1e3 / 9,
    resourceTypes: ["wood", "food", "stone", "points"],
    skinColors: [
        "#bf8f54", "#cbb091", "#896c4b",
		"#fadadc", "#ececec", "#c37373",
        "#4c4c4c", "#ecaff7", "#738cc3",
	 	"#8bc373"
    ],
    playerScale: 35,
	playerSpeed: 0.0016,
	playerDecel: 0.993,
    mapScale: 14400,
    maxScreenWidth: 1920,
    maxScreenHeight: 1080,
    gatherAngle: Math.PI / 2.6,
    shieldAngle: Math.PI / 3,
    maxAge: 100,
    riverWidth: 724
};

const weaponVariants = [{
    id: 0,
    src: "",
    xp: 0,
    val: 1
}, {
    id: 1,
    src: "_g",
    xp: 3000,
    val: 1.1
}, {
    id: 2,
    src: "_d",
    xp: 7000,
    val: 1.18
}, {
    id: 3,
    src: "_r",
    poison: true,
    xp: 12000,
    val: 1.18
}];

module.exports.fetchVariant = (player) => {
    let tmpXP = player.weapons[player.weaponIndex] || 0;

    for (let i = weaponVariants.length - 1; i >= 0; i--) {
        if (tmpXP >= weaponVariants[i].xp) return weaponVariants[i];
    }
};

module.exports.weaponVariants = weaponVariants;