// Game object: {
//   // Static informations:
//   id: string
//   vname: string,
//   fenStart: string,
//   players: array of sid+id+name,
//   cadence: string,
//   increment: integer (seconds),
//   type: string ("live" or "corr")
//   // Game (dynamic) state:
//   fen: string,
//   moves: array of Move objects,
//   clocks: array of integers,
//   initime: array of integers (when clock start running),
//   score: string (several options; '*' == running),
// }

import { store } from "@/store";

function dbOperation(callback) {
  let db = null;
  let DBOpenRequest = window.indexedDB.open("vchess", 5);

  DBOpenRequest.onerror = function(event) {
    alert(store.state.tr[
      "Database error: stop private browsing, or update your browser"]);
    callback("error", null);
  };

  DBOpenRequest.onsuccess = function() {
    db = DBOpenRequest.result;
    callback(null, db);
    db.close();
  };

  DBOpenRequest.onupgradeneeded = function(event) {
    let db = event.target.result;
    let upgradeTransaction = event.target.transaction;
    let objectStore = undefined;
    if (!db.objectStoreNames.contains("games"))
      objectStore = db.createObjectStore("games", { keyPath: "id" });
    else
      objectStore = upgradeTransaction.objectStore("games");
    if (!objectStore.indexNames.contains("score"))
      // To sarch games by score (useful for running games)
      objectStore.createIndex("score", "score", { unique: false });
    if (!objectStore.indexNames.contains("created"))
      // To search by date intervals. Two games cannot start at the same time
      objectStore.createIndex("created", "created", { unique: true });
  };
}

export const GameStorage = {

  // Optional callback to get error status
  add: function(game, callback) {
    dbOperation((err, db) => {
      if (!!err) {
        callback("error");
        return;
      }
      let transaction = db.transaction("games", "readwrite");
      transaction.oncomplete = function() {
        // Everything's fine
        callback();
      };
      transaction.onerror = function(err) {
        // Duplicate key error (most likely)
        callback(err);
      };
      transaction.objectStore("games").add(game);
    });
  },

  // obj: chat, move, fen, clocks, score[Msg], initime, ...
  update: function(gameId, obj) {
    dbOperation((err, db) => {
      let objectStore = db
        .transaction("games", "readwrite")
        .objectStore("games");
      objectStore.get(gameId).onsuccess = function(event) {
        // Ignoring error silently: shouldn't happen now. TODO?
        if (!!event.target.result) {
          let game = event.target.result;
          // Hidden tabs are delayed, to prevent multi-updates:
          if (obj.moveIdx < game.moves.length) return;
          Object.keys(obj).forEach(k => {
            if (k == "move") game.moves.push(obj[k]);
            else if (k == "chat") game.chats.push(obj[k]);
            else if (k == "chatRead") game.chatRead = Date.now();
            else if (k == "delchat") game.chats = [];
            else if (k == "playerName")
              game.players[obj[k].idx].name = obj[k].name;
            else game[k] = obj[k];
          });
          objectStore.put(game); //save updated data
        }
      };
    });
  },

  // Retrieve (all) running local games
  getRunning: function(callback) {
    dbOperation((err, db) => {
      let objectStore = db
        .transaction("games", "readonly")
        .objectStore("games");
      let index = objectStore.index("score");
      const range = IDBKeyRange.only("*");
      let games = [];
      index.openCursor(range).onsuccess = function(event) {
        let cursor = event.target.result;
        if (!cursor) callback(games);
        else {
          // If there is still another cursor to go, keep running this code
          let g = cursor.value;
          // Do not retrieve moves or clocks (unused in list mode)
          g.movesCount = g.moves.length;
          delete g.moves;
          delete g.clocks;
          delete g.initime;
          games.push(g);
          cursor.continue();
        }
      };
    });
  },

  // Retrieve completed local games
  getNext: function(upperDt, callback) {
    dbOperation((err, db) => {
      let objectStore = db
        .transaction("games", "readonly")
        .objectStore("games");
      let index = objectStore.index("created");
      const range = IDBKeyRange.upperBound(upperDt);
      let games = [];
      index.openCursor(range).onsuccess = function(event) {
        let cursor = event.target.result;
        if (!cursor) {
          // Most recent games first:
          games = games.sort((g1, g2) => g2.created - g1.created);
          // TODO: 20 games showed per request is arbitrary
          callback(games.slice(0, 20));
        }
        else {
          // If there is still another cursor to go, keep running this code
          let g = cursor.value;
          if (g.score != "*") {
            // Do not retrieve moves or clocks (unused in list mode)
            g.movesCount = g.moves.length;
            delete g.moves;
            delete g.clocks;
            delete g.initime;
            games.push(g);
          }
          cursor.continue();
        }
      };
    });
  },

  // Retrieve any game from its identifier.
  // NOTE: need callback because result is obtained asynchronously
  get: function(gameId, callback) {
    dbOperation((err, db) => {
      let objectStore = db.transaction("games").objectStore("games");
      objectStore.get(gameId).onsuccess = function(event) {
        // event.target.result is null if game not found
        callback(event.target.result);
      };
    });
  },

  // Delete a game in indexedDB
  remove: function(gameId, callback) {
    dbOperation((err, db) => {
      if (!err) {
        let transaction = db.transaction("games", "readwrite");
        transaction.oncomplete = function() {
          callback(); //everything's fine
        };
        transaction.objectStore("games").delete(gameId);
      }
    });
  }

};
