import { extractTime } from "@/utils/timeControl";

// TODO: show game structure
//const newItem = [
//	{ gameId: "", players: [], timeControl: "", clocks: [] }
//];

function dbOperation(callback)
{
  let db = null;
  let DBOpenRequest = window.indexedDB.open("vchess", 4);

  DBOpenRequest.onerror = function(event) {
    alert("Database error: " + event.target.errorCode);
  };

  DBOpenRequest.onsuccess = function(event) {
    db = DBOpenRequest.result;
    callback(db);
    db.close();
  };

  DBOpenRequest.onupgradeneeded = function(event) {
    let db = event.target.result;
    db.onerror = function(event) {
      alert("Error while loading database: " + event.target.errorCode);
    };
    // Create objectStore for vchess->games
    db.createObjectStore("games", { keyPath: "gameId" });
  }
}

// Optional callback to get error status
function addGame(game, callback)
{
  dbOperation((db) => {
    let transaction = db.transaction(["games"], "readwrite");
    if (callback)
    {
      transaction.oncomplete = function() {
        callback({}); //everything's fine
      }
      transaction.onerror = function() {
        callback({errmsg: "addGame failed: " + transaction.error});
      };
    }
    let objectStore = transaction.objectStore("games");
    objectStore.add(game);
  });
}

// Clear current live game from localStorage
function clear() {
  localStorage.deleteItem("gameInfo");
  localStorage.deleteItem("gameState");
}

// Current live game:
function getCurrent()
{
  return Object.assign({},
    JSON.parse(localStorage.getItem("gameInfo")),
    JSON.parse(localStorage.getItem("gameState")));
}

// Only called internally after a score update
function transferToDb()
{
  addGame(getCurrent(), (err) => {
    if (!!err.errmsg)
      return err;
    clear();
  });
}

export const GameStorage =
{
  // localStorage:
  init: function(o)
  {
    // Extract times (in [milli]seconds), set clocks, store in localStorage
    const tc = extractTime(o.timeControl);

    // game infos: constant
    const gameInfo =
    {
      gameId: o.gameId,
      vname: o.vname,
      fenStart: o.fenStart,
      players: o.players,
      timeControl: o.timeControl,
      increment: tc.increment,
      mode: "live", //function for live games only
    };

    // game state: will be updated
    const gameState =
    {
      fen: o.fenStart,
      moves: [],
      clocks: [...Array(o.players.length)].fill(tc.mainTime),
      started: [...Array(o.players.length)].fill(false),
      score: "*",
    };

    localStorage.setItem("gameInfo", JSON.stringify(gameInfo));
    localStorage.setItem("gameState", JSON.stringify(gameState));
  },

  // localStorage:
  // TODO: also option to takeback a move ?
  // NOTE: for live games only (all on server for corr)
  update: function(o) //move, clock, initime, score, colorIdx
  {
    // TODO: finish this --> colorIdx must be computed before entering the function
    let gameState = JSON.parse(localStorage.getItem("gameState"));
    if (!!o.move)
    {
      // https://stackoverflow.com/a/38750895
      const allowed = ['appear', 'vanish', 'start', 'end'];
      const filtered_move = Object.keys(o.move)
        .filter(key => allowed.includes(key))
        .reduce((obj, key) => {
          obj[key] = raw[key];
          return obj;
        }, {});
      gameState.moves.push(filtered_move);
      gameState.fen = o.move.fen;
      const colorIdx = ["w","b","g","r"][o.move.color];
      gameState.clocks[colorIdx] = o.move.clock;
    }
    if (!!o.initime) //just a flag (true)
      gameState.initime = Date.now();
    if (!!o.score)
      gameState.score = o.score;
    localStorage.setItem("gameState", JSON.stringify(gameState));
    if (!!o.score && o.score != "*")
      transferToDb(); //game is over
  },

  // indexedDB:
  // Since DB requests are asynchronous, require a callback using the result
  // TODO: option for remote retrieval (third arg, or just "gameRef")
  getLocal: function(gameId, callback)
  {
    let games = [];
    dbOperation((db) => {
      // TODO: if gameId is provided, limit search to gameId (just .get(gameId). ...)
      let objectStore = db.transaction('games').objectStore('games');
      objectStore.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        // if there is still another cursor to go, keep runing this code
        if (cursor)
        {
          games.push(cursor.value);
          cursor.continue();
        }
        else
          callback(games);
      }
    });
  },

  // Delete a game in indexedDB
  remove: function(gameId, callback)
  {
    dbOperation((db) => {
      let transaction = db.transaction(["games"], "readwrite");
      if (callback)
      {
        transaction.oncomplete = function() {
          callback({}); //everything's fine
        }
        transaction.onerror = function() {
          callback({errmsg: "deleteGame failed: " + transaction.error});
        };
      }
      transaction.objectStore("games").delete(gameId);
    });
  },

  // Retrieve any live game from its identifiers (remote or not, running or not)
  // NOTE: need callback because result might be obtained asynchronously
  get: function(gameRef, callback)
  {
    const gid = gameRef.id;
    const rid = gameRef.rid; //may be blank
    if (!!rid)
    {
      // TODO: send request to server which forward to user sid == rid,
      // need to listen to "remote game" event in main hall ?
      return callback({}); //means "the game will arrive later" (TODO...)
    }

    const gameInfoStr = localStorage.getItem("gameInfo");
    if (gameInfoStr)
    {
      const gameInfo = JSON.parse(gameInfoStr);
      if (gameInfo.gameId == gid)
      {
        const gameState = JSON.parse(localStorage.getItem("gameState"));
        return callback(Object.assign({}, gameInfo, gameState));
      }
    }

    // Game is local and not running
    GameStorage.getLocal(gid, callback);
  },
};
