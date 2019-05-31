import { extractTime } from "@/utils/timeControl";
import { shuffle } from "@/utils/alea";

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
    // NOTE: when >= 3 players, better use an array + shuffle for mycolor
    const mycolor = (Math.random() < 0.5 ? "w" : "b");
    // Shuffle players order (white then black then other colors).
    const players = shuffle(o.players);
    // Extract times (in [milli]seconds), set clocks, store in localStorage
    const tc = extractTime(o.timeControl);

    // game infos: constant
    const gameInfo =
    {
      gameId: o.gameId,
      vname: o.vname,
      mycolor: mycolor,
      fenStart: o.fenStart,
      players: players,
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
  // TODO: also option to takeback a move ? Is fen included in move ?
  // NOTE: for live games only (all on server for corr)
  update: function(fen, moves, clocks, started, score)
  {
    let gameState = JSON.parse(localStorage.getItem("gameState"));
    if (!!fen)
    {
      gameState.moves = moves;
      gameState.fen = fen;
      gameState.clocks = clocks;
    }
    if (!!started)
      gameState.started = started;
    if (!!score)
      gameState.score = score;
    localStorage.setItem("gameState", JSON.stringify(gameState));
    if (!!score && score != "*")
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
