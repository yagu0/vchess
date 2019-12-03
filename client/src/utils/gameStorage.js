// Game object: {
//   // Static informations:
//   gameId: string
//   vname: string,
//   fenStart: string,
//   players: array of sid+id+name,
//   timeControl: string,
//   increment: integer (seconds),
//   mode: string ("live" or "corr")
//   imported: boolean (optional, default false)
//   // Game (dynamic) state:
//   fen: string,
//   moves: array of Move objects,
//   clocks: array of integers,
//   initime: array of integers (when clock start running),
//   score: string (several options; '*' == running),
// }

import { ajax } from "@/utils/ajax";

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
    let objectStore = db.createObjectStore("games", { keyPath: "gameId" });
    objectStore.createIndex("score", "score"); //to search by game result
  }
}

export const GameStorage =
{
  // Optional callback to get error status
  // TODO: this func called from Hall seems to not work now...
  add: function(game, callback)
  {
    dbOperation((db) => {
      let transaction = db.transaction("games", "readwrite");
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
  },

  // TODO: also option to takeback a move ?
  update: function(gameId, obj) //move, fen, clocks, score, initime, ...
  {
    if (Number.isInteger(gameId) || !isNaN(parseInt(gameId)))
    {
      // corr: only move, fen and score
      ajax(
        "/games",
        "PUT",
        {
          gid: gameId,
          newObj:
          {
            // TODO: I think stringify isn't requuired here (see ajax() )
            move: JSON.stringify(obj.move), //may be undefined...
            fen: obj.fen,
            score: obj.score,
          }
        }
      );
    }
    else
    {
      // live
      dbOperation((db) => {
        let objectStore = db.transaction("games", "readwrite").objectStore("games");
        objectStore.get(gameId).onsuccess = function(event) {
          const game = event.target.result;
          Object.keys(obj).forEach(k => {
            if (k == "move")
              game.moves.push(obj[k]);
            else
              game[k] = obj[k];
          });
          objectStore.put(game); //save updated data
        }
      });
    }
  },

  // Retrieve all local games (running, completed, imported...)
  getAll: function(callback)
  {
    dbOperation((db) => {
      let objectStore = db.transaction('games').objectStore('games');
      let games = [];
      objectStore.openCursor().onsuccess = function(event) {
        let cursor = event.target.result;
        // if there is still another cursor to go, keep running this code
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

  // Retrieve any game from its identifiers (locally or on server)
  // NOTE: need callback because result is obtained asynchronously
  get: function(gameId, callback)
  {
    // corr games identifiers are integers
    if (Number.isInteger(gameId) || !isNaN(parseInt(gameId)))
    {
      ajax("/games", "GET", {gid:gameId}, res => {
        callback(res.game);
      });
    }
    else //local game
    {
      dbOperation((db) => {
        let objectStore = db.transaction('games').objectStore('games');
        objectStore.get(gameId).onsuccess = function(event) {
          callback(event.target.result);
        }
      });
    }
  },

  getCurrent: function(callback)
  {
    dbOperation((db) => {
      let objectStore = db.transaction('games').objectStore('games');
      objectStore.get("*").onsuccess = function(event) {
        callback(event.target.result);
      };
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
          callback({errmsg: "removeGame failed: " + transaction.error});
        };
      }
      transaction.objectStore("games").delete(gameId);
    });
  },
};
