const db = require("../utils/database");
const UserModel = require("./User");

/*
 * Structure table Games:
 *   id: game id (int)
 *   vid: integer (variant id)
 *   fenStart: varchar (initial position)
 *   fen: varchar (current position)
 *   white: integer
 *   black: integer
 *   cadence: string
 *   score: varchar (result)
 *   scoreMsg: varchar ("Time", "Mutual agreement"...)
 *   created: datetime
 *   drawOffer: char ('w','b' or '' for none)
 *   rematchOffer: char (similar to drawOffer)
 *   randomness: integer
 *   deletedByWhite: boolean
 *   deletedByBlack: boolean
 *
 * Structure table Moves:
 *   gid: ref game id
 *   squares: varchar (description)
 *   played: datetime
 *   idx: integer
 *
 * Structure table Chats:
 *   gid: game id (int)
 *   msg: varchar
 *   name: varchar
 *   added: datetime
 */

const GameModel =
{
  checkGameInfo: function(g) {
    return (
      g.vid.toString().match(/^[0-9]+$/) &&
      g.cadence.match(/^[0-9dhms +]+$/) &&
      g.randomness.match(/^[0-2]$/) &&
      g.fen.match(/^[a-zA-Z0-9, /-]*$/) &&
      g.players.length == 2 &&
      g.players.every(p => p.toString().match(/^[0-9]+$/))
    );
  },

  create: function(vid, fen, randomness, cadence, players, cb) {
    db.serialize(function() {
      let query =
        "INSERT INTO Games " +
        "(" +
          "vid, fenStart, fen, randomness, " +
          "white, black, " +
          "cadence, created" +
        ") " +
        "VALUES " +
        "(" +
          vid + ",'" + fen + "','" + fen + "'," + randomness + "," +
          "'" + players[0] + "','" + players[1] + "," +
          "'" + cadence + "'," + Date.now() +
        ")";
      db.run(query, function(err) {
        cb(err, { id: this.lastId });
      });
    });
  },

  // TODO: some queries here could be async
  getOne: function(id, cb) {
    // NOTE: ignoring errors (shouldn't happen at this stage)
    db.serialize(function() {
      let query =
        "SELECT " +
          "g.id, g.vid, g.fen, g.fenStart, g.cadence, g.created, " +
          "g.white, g.black, g.score, g.scoreMsg, " +
          "g.drawOffer, g.rematchOffer, v.name AS vname " +
        "FROM Games g " +
        "JOIN Variants v " +
        "  ON g.vid = v.id " +
        "WHERE g.id = " + id;
      db.get(query, (err, gameInfo) => {
        query =
          "SELECT squares, played, idx " +
          "FROM Moves " +
          "WHERE gid = " + id;
        db.all(query, (err3, moves) => {
          query =
            "SELECT msg, name, added " +
            "FROM Chats " +
            "WHERE gid = " + id;
          db.all(query, (err4, chats) => {
            const game = Object.assign(
              {},
              gameInfo,
              {
                moves: moves,
                chats: chats
              }
            );
            cb(null, game);
          });
        });
      });
    });
  },

  // For display on Hall: no need for moves or chats
  getObserved: function(uid, cursor, cb) {
    db.serialize(function() {
      let query =
        "SELECT g.id, g.vid, g.cadence, g.created, " +
        "       g.score, g.white, g.black " +
        "FROM Games g ";
      if (uid > 0) query +=
        "WHERE " +
        "  created < " + cursor + " AND " +
        "  white <> " + uid + " AND " +
        "  black <> " + uid + " ";
      query +=
        "ORDER BY created DESC " +
        "LIMIT 20"; //TODO: 20 hard-coded...
      db.all(query, (err, games) => {
        // Query players names
        let pids = {};
        games.forEach(g => {
          if (!pids[g.white]) pids[g.white] = true;
          if (!pids[g.black]) pids[g.black] = true;
        });
        UserModel.getByIds(Object.keys(pids), (err2, users) => {
          let names = {};
          users.forEach(u => { names[u.id] = u.name; });
          cb(
            games.map(
              g => {
                return {
                  id: g.id,
                  cadence: g.cadence,
                  vname: g.vname,
                  created: g.created,
                  score: g.score,
                  white: names[g.white],
                  black: names[g.black]
                };
              }
            )
          );
        });
      });
    });
  },

  // For display on MyGames: registered user only
  getRunning: function(uid, cb) {
    db.serialize(function() {
      let query =
        "SELECT g.id, g.cadence, g.created, g.score, " +
          "g.white, g.black, v.name AS vname " +
        "FROM Games g " +
        "JOIN Variants v " +
        "  ON g.vid = v.id " +
        "WHERE white = " + uid + " OR black = " + uid;
      db.all(query, (err, games) => {
        // Get movesCount (could be done in // with next query)
        query =
          "SELECT gid, COUNT(*) AS nbMoves " +
          "FROM Moves " +
          "WHERE gid IN " + "(" + games.map(g => g.id).join(",") + ") " +
          "GROUP BY gid";
        db.all(query, (err, mstats) => {
          let movesCounts = {};
          mstats.forEach(ms => { movesCounts[ms.gid] = ms.nbMoves; });
          // Query player names
          let pids = {};
          games.forEach(g => {
            if (!pids[g.white]) pids[g.white] = true;
            if (!pids[g.black]) pids[g.black] = true;
          });
          UserModel.getByIds(pids, (err2, users) => {
            let names = {};
            users.forEach(u => { names[u.id] = u.name; });
            cb(
              games.map(
                g => {
                  return {
                    id: g.id,
                    cadence: g.cadence,
                    vname: g.vname,
                    created: g.created,
                    score: g.score,
                    movesCount: movesCounts[g.id],
                    white: names[g.white],
                    black: names[g.black]
                  };
                }
              )
            );
          });
        });
      });
    });
  },

  // These games could be deleted on some side. movesCount not required
  getCompleted: function(uid, cursor, cb) {
    db.serialize(function() {
      let query =
        "SELECT g.id, g.cadence, g.created, g.score, g.scoreMsg, " +
          "g.white, g.black, g.deletedByWhite, g.deletedByBlack, " +
          "v.name AS vname " +
        "FROM Games g " +
        "JOIN Variants v " +
        "  ON g.vid = v.id " +
        "WHERE " +
        "  created < " + cursor + " AND " +
        "  (" +
        "    (" + uid + " = white AND NOT deletedByWhite) OR " +
        "    (" + uid + " = black AND NOT deletedByBlack)" +
        "  ) ";
      query +=
        "ORDER BY created DESC " +
        "LIMIT 20";
      db.all(query, (err, games) => {
        // Query player names
        let pids = {};
        games.forEach(g => {
          if (!pids[g.white]) pids[g.white] = true;
          if (!pids[g.black]) pids[g.black] = true;
        });
        UserModel.getByIds(pids, (err2, users) => {
          let names = {};
          users.forEach(u => { names[u.id] = u.name; });
          cb(
            games.map(
              g => {
                return {
                  id: g.id,
                  cadence: g.cadence,
                  vname: g.vname,
                  created: g.created,
                  score: g.score,
                  scoreMsg: g.scoreMsg,
                  white: names[g.white],
                  black: names[g.black],
                  deletedByWhite: g.deletedByWhite,
                  deletedByBlack: g.deletedByBlack
                };
              }
            )
          );
        });
      });
    });
  },

  getPlayers: function(id, cb) {
    db.serialize(function() {
      const query =
        "SELECT white, black " +
        "FROM Games " +
        "WHERE gid = " + id;
      db.all(query, (err, players) => {
        return cb(err, players);
      });
    });
  },

  checkGameUpdate: function(obj) {
    // Check all that is possible (required) in obj:
    return (
      (
        !obj.move || (
          !!(obj.move.played.toString().match(/^[0-9]+$/)) &&
          !!(obj.move.idx.toString().match(/^[0-9]+$/))
        )
      ) && (
        !obj.drawOffer || !!(obj.drawOffer.match(/^[wbtn]$/))
      ) && (
        !obj.rematchOffer || !!(obj.rematchOffer.match(/^[wbn]$/))
      ) && (
        !obj.fen || !!(obj.fen.match(/^[a-zA-Z0-9, /-]*$/))
      ) && (
        !obj.score || !!(obj.score.match(/^[012?*\/-]+$/))
      ) && (
        !obj.scoreMsg || !!(obj.scoreMsg.match(/^[a-zA-Z ]+$/))
      ) && (
        !obj.chat || UserModel.checkNameEmail({name: obj.chat.name})
      )
    );
  },

  // obj can have fields move, chat, fen, drawOffer and/or score + message
  update: function(id, obj, cb) {
    db.parallelize(function() {
      let query =
        "UPDATE Games " +
        "SET ";
      let modifs = "";
      // NOTE: if drawOffer is set, we should check that it's player's turn
      // A bit overcomplicated. Let's trust the client on that for now...
      if (!!obj.drawOffer)
      {
        if (obj.drawOffer == "n") //special "None" update
          obj.drawOffer = "";
        modifs += "drawOffer = '" + obj.drawOffer + "',";
      }
      if (!!obj.rematchOffer)
      {
        if (obj.rematchOffer == "n") //special "None" update
          obj.rematchOffer = "";
        modifs += "rematchOffer = '" + obj.rematchOffer + "',";
      }
      if (!!obj.fen)
        modifs += "fen = '" + obj.fen + "',";
      if (!!obj.score)
        modifs += "score = '" + obj.score + "',";
      if (!!obj.scoreMsg)
        modifs += "scoreMsg = '" + obj.scoreMsg + "',";
      if (!!obj.deletedBy) {
        const myColor = obj.deletedBy == 'w' ? "White" : "Black";
        modifs += "deletedBy" + myColor + " = true,";
      }
      modifs = modifs.slice(0,-1); //remove last comma
      if (modifs.length > 0)
      {
        query += modifs + " WHERE id = " + id;
        db.run(query);
      }
      // NOTE: move, chat and delchat are mutually exclusive
      if (!!obj.move)
      {
        // Security: only update moves if index is right
        query =
          "SELECT MAX(idx) AS maxIdx " +
          "FROM Moves " +
          "WHERE gid = " + id;
        db.get(query, (err,ret) => {
          const m = obj.move;
          if (!ret.maxIdx || ret.maxIdx + 1 == m.idx) {
            query =
              "INSERT INTO Moves (gid, squares, played, idx) VALUES " +
              "(" + id + ",?," + m.played + "," + m.idx + ")";
            db.run(query, JSON.stringify(m.squares));
            cb(null);
          }
          else cb({errmsg:"Wrong move index"});
        });
      }
      else cb(null);
      if (!!obj.chat)
      {
        query =
          "INSERT INTO Chats (gid, msg, name, added) VALUES ("
            + id + ",?,'" + obj.chat.name + "'," + Date.now() + ")";
        db.run(query, obj.chat.msg);
      }
      else if (obj.delchat)
      {
        query =
          "DELETE " +
          "FROM Chats " +
          "WHERE gid = " + id;
        db.run(query);
      }
      if (!!obj.deletedBy) {
        // Did my opponent delete it too?
        let selection =
          "deletedBy" +
          (obj.deletedBy == 'w' ? "Black" : "White") +
          " AS deletedByOpp";
        query =
          "SELECT " + selection + " " +
          "FROM Games " +
          "WHERE id = " + id;
        db.get(query, (err,ret) => {
          // If yes: just remove game
          if (!!ret.deletedByOpp) GameModel.remove(id);
        });
      }
    });
  },

  remove: function(id_s) {
    const suffix =
      Array.isArray(id_s)
        ? " IN (" + id_s.join(",") + ")"
        : " = " + id_s;
    db.parallelize(function() {
      let query =
        "DELETE FROM Games " +
        "WHERE id " + suffix;
      db.run(query);
      query =
        "DELETE FROM Moves " +
        "WHERE gid " + suffix;
      db.run(query);
      query =
        "DELETE FROM Chats " +
        "WHERE gid " + suffix;
      db.run(query);
    });
  },

  cleanGamesDb: function() {
    const tsNow = Date.now();
    // 86400000 = 24 hours in milliseconds
    const day = 86400000;
    db.serialize(function() {
      let query =
        "SELECT id, created " +
        "FROM Games";
      db.all(query, (err, games) => {
        query =
          "SELECT gid, count(*) AS nbMoves, MAX(played) AS lastMaj " +
          "FROM Moves " +
          "GROUP BY gid";
        db.get(query, (err2, mstats) => {
          // Reorganize moves data to avoid too many array lookups:
          let movesGroups = {};
          mstats.forEach(ms => {
            movesGroups[ms.gid] = {
              nbMoves: ms.nbMoves,
              lastMaj: ms.lastMaj
            };
          });
          // Remove games still not really started,
          // with no action in the last 3 months:
          let toRemove = [];
          games.forEach(g => {
            if (
              (
                !movesGroups[g.id] &&
                tsNow - g.created > 91*day
              )
              ||
              (
                movesGroups[g.id].nbMoves == 1 &&
                tsNow - movesGroups[g.id].lastMaj > 91*day
              )
            ) {
              toRemove.push(g.id);
            }
          });
          if (toRemove.length > 0) GameModel.remove(toRemove);
        });
      });
    });
  }
}

module.exports = GameModel;
