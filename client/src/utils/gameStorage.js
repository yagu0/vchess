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
  let DBOpenRequest = window.indexedDB.open("vchess", 4);

  DBOpenRequest.onerror = function(event) {
    alert(store.state.tr["Database error: stop private browsing, or update your browser"]);
    callback("error",null);
  };

  DBOpenRequest.onsuccess = function() {
    db = DBOpenRequest.result;
    callback(null,db);
    db.close();
  };

  DBOpenRequest.onupgradeneeded = function(event) {
    let db = event.target.result;
    let objectStore = db.createObjectStore("games", { keyPath: "id" });
    objectStore.createIndex("score", "score"); //to search by game result
  };
}

export const GameStorage = {
  // Optional callback to get error status
  add: function(game, callback) {
    dbOperation((err,db) => {
      if (!!err) {
        callback("error");
        return;
      }
      let transaction = db.transaction("games", "readwrite");
      transaction.oncomplete = function() {
        callback(); //everything's fine
      };
      transaction.onerror = function(err) {
        callback(err); //duplicate key error (most likely)
      };
      let objectStore = transaction.objectStore("games");
      objectStore.add(game);
    });
  },

  // obj: chat, move, fen, clocks, score[Msg], initime, ...
  update: function(gameId, obj) {
    // live
    dbOperation((err,db) => {
      let objectStore = db
        .transaction("games", "readwrite")
        .objectStore("games");
      objectStore.get(gameId).onsuccess = function(event) {
        // Ignoring error silently: shouldn't happen now. TODO?
        if (event.target.result) {
          let game = event.target.result;
          // Hidden tabs are delayed, to prevent multi-updates:
          if (obj.moveIdx < game.moves.length) return;
          Object.keys(obj).forEach(k => {
            if (k == "move") game.moves.push(obj[k]);
            else game[k] = obj[k];
          });
          objectStore.put(game); //save updated data
        }
      };
    });
  },

  // Retrieve all local games (running, completed, imported...)
  // light: do not retrieve moves or clocks (TODO: this is the only usage)
  getAll: function(light, callback) {
    dbOperation((err,db) => {
      let objectStore = db.transaction("games").objectStore("games");
      let games = [];
      objectStore.openCursor().onsuccess = function(event) {
        let cursor = event.target.result;
        // if there is still another cursor to go, keep running this code
        if (cursor) {
          let g = cursor.value;
          if (light) {
            g.movesCount = g.moves.length;
            delete g.moves;
            delete g.clocks;
            delete g.initime;
          }
          games.push(g);
          cursor.continue();
        } else callback(games);
      };
    });
  },

  // Retrieve any game from its identifiers (locally or on server)
  // NOTE: need callback because result is obtained asynchronously
  get: function(gameId, callback) {
    // Local game
    dbOperation((err,db) => {
      let objectStore = db.transaction("games").objectStore("games");
      objectStore.get(gameId).onsuccess = function(event) {
        if (event.target.result)
          callback(event.target.result);
      };
    });
  },

  // Delete a game in indexedDB
  remove: function(gameId, callback) {
    dbOperation((err,db) => {
      if (!err) {
        let transaction = db.transaction(["games"], "readwrite");
        transaction.oncomplete = function() {
          callback(); //everything's fine
        };
        transaction.objectStore("games").delete(gameId);
      }
    });
  }
};
