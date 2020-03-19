// (Comp)Game object: {
//   // Static informations:
//   vname: string (this is the ID)
//   fenStart: string,
//   mycolor: "w" or "b"
//   // Game (dynamic) state:
//   fen: string,
//   moves: array of Move objects,
// }

import { store } from "@/store";

function dbOperation(callback) {
  let db = null;
  let DBOpenRequest = window.indexedDB.open("vchess_comp", 4);

  DBOpenRequest.onerror = function(event) {
    alert(store.state.tr["Database error: stop private browsing, or update your browser"]);
    callback("error", null);
  };

  DBOpenRequest.onsuccess = function(event) {
    db = DBOpenRequest.result;
    callback(null, db);
    db.close();
  };

  DBOpenRequest.onupgradeneeded = function(event) {
    let db = event.target.result;
    let upgradeTransaction = event.target.transaction;
    if (!db.objectStoreNames.contains("compgames"))
      db.createObjectStore("compgames", { keyPath: "vname" });
    else
      upgradeTransaction.objectStore("compgames");
  };
}

export const CompgameStorage = {
  add: function(game) {
    dbOperation((err,db) => {
      if (err) return;
      let objectStore = db
        .transaction("compgames", "readwrite")
        .objectStore("compgames");
      objectStore.add(game);
    });
  },

  // obj: move and/or fen
  update: function(gameId, obj) {
    dbOperation((err,db) => {
      let objectStore = db
        .transaction("compgames", "readwrite")
        .objectStore("compgames");
      objectStore.get(gameId).onsuccess = function(event) {
        // Ignoring error silently: shouldn't happen now. TODO?
        if (event.target.result) {
          const game = event.target.result;
          Object.keys(obj).forEach(k => {
            if (k == "move") game.moves.push(obj[k]);
            else game[k] = obj[k];
          });
          objectStore.put(game); //save updated data
        }
      };
    });
  },

  // Retrieve any game from its identifier (variant name)
  // NOTE: need callback because result is obtained asynchronously
  get: function(gameId, callback) {
    dbOperation((err,db) => {
      let objectStore = db
        .transaction("compgames", "readonly")
        .objectStore("compgames");
      objectStore.get(gameId).onsuccess = function(event) {
        callback(event.target.result);
      };
    });
  },

  // Delete a game in indexedDB
  remove: function(gameId) {
    dbOperation((err,db) => {
      if (!err) {
        db.transaction("compgames", "readwrite")
          .objectStore("compgames")
          .delete(gameId);
      }
    });
  }
};
