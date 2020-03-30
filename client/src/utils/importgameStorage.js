// Game object struct: see gameStorgae.js

import { store } from "@/store";

function dbOperation(callback) {
  let db = null;
  let DBOpenRequest = window.indexedDB.open("vchess_import", 4);

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
    if (!db.objectStoreNames.contains("importgames"))
      objectStore = db.createObjectStore("importgames", { keyPath: "id" });
    else
      objectStore = upgradeTransaction.objectStore("importgames");
    if (!objectStore.indexNames.contains("created"))
      // To search by date intervals. Two games could start at the same time
      objectStore.createIndex("created", "created", { unique: false });
  };
}

export const ImportgameStorage = {
  // Optional callback to get error status
  add: function(game, callback) {
    dbOperation((err, db) => {
      if (!!err) {
        callback("error");
        return;
      }
      let transaction = db.transaction("importgames", "readwrite");
      transaction.oncomplete = function() {
        // Everything's fine
        callback();
      };
      transaction.onerror = function(err) {
        // Duplicate key error (most likely)
        callback(err);
      };
      transaction.objectStore("importgames").add(game);
    });
  },

  // Retrieve next imported games
  getNext: function(upperDt, callback) {
    dbOperation((err, db) => {
      let objectStore = db
        .transaction("importgames", "readonly")
        .objectStore("importgames");
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

  // Retrieve any game from its identifier.
  // NOTE: need callback because result is obtained asynchronously
  get: function(gameId, callback) {
    dbOperation((err, db) => {
      let objectStore =
        db.transaction("importgames").objectStore("importgames");
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
        let transaction = db.transaction("importgames", "readwrite");
        transaction.oncomplete = function() {
          callback(); //everything's fine
        };
        transaction.objectStore("importgames").delete(gameId);
      }
    });
  }
};
