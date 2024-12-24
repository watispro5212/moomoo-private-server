const Packets = {
    CLIENT_TO_SERVER: {
        JOIN_GAME: "M",
        PING_SOCKET: "0",
        AUTO_GATHER: "K",   
        MOVE: "9",
        RESET_MOVEMENT_DIR: "e",
        SEND_CHAT: "6",
        SEND_HIT: "F",
        SEND_AIM: "D",
        SEND_UPGRADE: "H",
        STORE: "c",
        SELECT_TO_BUILD: "z"
    },

    SERVER_TO_CLIENT: {
        SET_UP_GAME: "C",
        PING_SOCKET: "0",
        ADD_PLAYER: "D",
        REMOVE_PLAYER: "E",
        UPDATE_PLAYERS: "a",
        UPDATE_LEADERBOARD: "G",
        UPDATE_ITEMS: "V",
        UPDATE_AGE: "T",
        KILL_PLAYER: "P",
        UPDATE_UPGRADES: "U",
        RECEIVE_CHAT: "6",
        LOAD_GAME_OBJECT: "H",
        GATHER_ANIMATION: "K",
        WIGGLE_GAME_OBJECT: "L",
        SHOOT_TURRET: "M",
        UPDATE_PLAYER_VALUE: "N",
        UPDATE_HEALTH: "O",
        KILL_OBJECT: "Q",
        KILL_OBJECTS: "R",
        UPDATE_ITEM_COUNTS: "S",
        ADD_PROJ: "X",
        REM_PROJ: "Y",
        UPDATE_STORE_ITEMS: "5",
        SHOW_TEXT: "8",
        UPDATE_MINIMAP: "7"
    }
};

export default Packets;