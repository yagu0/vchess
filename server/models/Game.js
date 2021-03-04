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
 *   chatReadWhite: datetime
 *   chatReadBlack: datetime
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

const GameModel = {

  checkGameInfo: function(g) {
    return (
      g.vid.toString().match(/^[0-9]+$/) &&
      g.cadence.match(/^[0-9dhms +]+$/) &&
      g.randomness.toString().match(/^[0-2]$/) &&
      g.fen.match(/^[a-zA-Z0-9, /-]*$/) &&
      g.players.length == 2 &&
      g.players.every(p => p.id.toString().match(/^[0-9]+$/))
    );
  },

  incrementCounter: function(vid, cb) {
    db.serialize(function() {
      let query =
        "UPDATE GameStat " +
        "SET total = total + 1 " +
        "WHERE vid = " + vid;
      db.run(query, cb);
    });
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
          players[0].id + "," + players[1].id + "," +
          "'" + cadence + "'," + Date.now() +
        ")";
      db.run(query, function(err) {
        cb(err, { id: this.lastID });
      });
    });
  },

  // TODO: some queries here could be async
  getOne: function(id, cb) {
    // NOTE: ignoring errors (shouldn't happen at this stage)
    db.serialize(function() {
      let query =
        "SELECT " +
          "g.id, g.fen, g.fenStart, g.cadence, g.created, " +
          "g.white, g.black, g.randomness, g.score, g.scoreMsg, " +
          "g.chatReadWhite, g.chatReadBlack, g.drawOffer, " +
          // TODO: vid and vname are redundant
          "g.rematchOffer, v.id as vid, v.name AS vname " +
        "FROM Games g " +
        "JOIN Variants v " +
        "  ON g.vid = v.id " +
        "WHERE g.id = " + id;
      db.get(query, (err, gameInfo) => {
        if (!gameInfo) {
          cb(err || { errmsg: "Game not found" }, undefined);
          return;
        }
        query =
          "SELECT id, name " +
          "FROM Users " +
          "WHERE id IN (" + gameInfo.white + "," + gameInfo.black + ")";
        db.all(query, (err2, players) => {
          if (players[0].id == gameInfo.black) players = players.reverse();
          // The original players' IDs info isn't required anymore
          delete gameInfo["white"];
          delete gameInfo["black"];
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
                  players: players,
                  moves: moves,
                  chats: chats
                }
              );
              cb(null, game);
            });
          });
        });
      });
    });
  },

  // For display on Hall: no need for moves or chats
  getObserved: function(uid, cursor, cb) {
    db.serialize(function() {
      let query =
        "SELECT id, vid, cadence, created, score, white, black " +
        "FROM Games " +
        "WHERE created < " + cursor + " ";
      if (uid > 0) {
        query +=
          "  AND white <> " + uid + " " +
          "  AND black <> " + uid + " ";
      }
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
            err,
            games.map(
              g => {
                return {
                  id: g.id,
                  vid: g.vid,
                  cadence: g.cadence,
                  created: g.created,
                  score: g.score,
                  players: [
                    { id: g.white, name: names[g.white] },
                    { id: g.black, name: names[g.black] }
                  ]
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
        "SELECT g.id, g.cadence, g.created, " +
          "g.white, g.black, v.name AS vname " +
        "FROM Games g " +
        "JOIN Variants v " +
        "  ON g.vid = v.id " +
        "WHERE score = '*' AND (white = " + uid + " OR black = " + uid + ")";
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
          UserModel.getByIds(Object.keys(pids), (err2, users) => {
            let names = {};
            users.forEach(u => { names[u.id] = u.name; });
            cb(
              null,
              games.map(
                g => {
                  return {
                    id: g.id,
                    vname: g.vname,
                    cadence: g.cadence,
                    created: g.created,
                    score: g.score,
                    movesCount: movesCounts[g.id] || 0,
                    players: [
                      { id: g.white, name: names[g.white] },
                      { id: g.black, name: names[g.black] }
                    ]
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
        "  score <> '*' AND" +
        "  created < " + cursor + " AND" +
        "  (" +
        "    (" +
        "      white = " + uid + " AND" +
        "      (deletedByWhite IS NULL OR NOT deletedByWhite)" +
        "    )" +
        "    OR " +
        "    (" +
        "      black = " + uid + " AND" +
        "      (deletedByBlack IS NULL OR NOT deletedByBlack)" +
        "    )" +
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
        UserModel.getByIds(Object.keys(pids), (err2, users) => {
          let names = {};
          users.forEach(u => { names[u.id] = u.name; });
          cb(
            null,
            games.map(
              g => {
                return {
                  id: g.id,
                  vname: g.vname,
                  cadence: g.cadence,
                  created: g.created,
                  score: g.score,
                  scoreMsg: g.scoreMsg,
                  players: [
                    { id: g.white, name: names[g.white] },
                    { id: g.black, name: names[g.black] }
                  ],
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
        "WHERE id = " + id;
      db.get(query, (err, players) => {
        return cb(err, players);
      });
    });
  },

  checkGameUpdate: function(obj) {
    // Check all that is possible (required) in obj:
    return (
      (
        !obj.move || !!(obj.move.idx.toString().match(/^[0-9]+$/))
      ) && (
        !obj.drawOffer || !!(obj.drawOffer.match(/^[wbtn]$/))
      ) && (
        !obj.rematchOffer || !!(obj.rematchOffer.match(/^[wbn]$/))
      ) && (
        !obj.fen || !!(obj.fen.match(/^[a-zA-Z0-9,.:{}\[\]" /-]*$/))
      ) && (
        !obj.score || !!(obj.score.match(/^[012?*\/-]+$/))
      ) && (
        !obj.chatRead || ['w','b'].includes(obj.chatRead)
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
      let updateQuery =
        "UPDATE Games " +
        "SET ";
      let modifs = "";
      // NOTE: if drawOffer is set, we should check that it's player's turn
      // A bit overcomplicated. Let's trust the client on that for now...
      if (!!obj.drawOffer) {
        if (obj.drawOffer == "n")
          // Special "None" update
          obj.drawOffer = "";
        modifs += "drawOffer = '" + obj.drawOffer + "',";
      }
      if (!!obj.rematchOffer) {
        if (obj.rematchOffer == "n")
          // Special "None" update
          obj.rematchOffer = "";
        modifs += "rematchOffer = '" + obj.rematchOffer + "',";
      }
      if (!!obj.fen) modifs += "fen = '" + obj.fen + "',";
      if (!!obj.deletedBy) {
        const myColor = obj.deletedBy == 'w' ? "White" : "Black";
        modifs += "deletedBy" + myColor + " = true,";
      }
      if (!!obj.chatRead) {
        const myColor = obj.chatRead == 'w' ? "White" : "Black";
        modifs += "chatRead" + myColor + " = " + Date.now() + ",";
      }
      if (!!obj.score) {
        modifs += "score = '" + obj.score + "'," +
                  "scoreMsg = '" + obj.scoreMsg + "',";
      }
      const finishAndSendQuery = () => {
        modifs = modifs.slice(0, -1); //remove last comma
        if (modifs.length > 0) {
          updateQuery += modifs + " WHERE id = " + id;
          db.run(updateQuery);
        }
        cb(null);
      };
      if (!!obj.move || (!!obj.score && obj.scoreMsg == "Time")) {
        // Security: only update moves if index is right,
        // and score with scoreMsg "Time" if really lost on time.
        let query =
          "SELECT MAX(idx) AS maxIdx, MAX(played) AS lastPlayed " +
          "FROM Moves " +
          "WHERE gid = " + id;
        db.get(query, (err, ret) => {
          if (!!obj.move ) {
            if (!ret.maxIdx || ret.maxIdx + 1 == obj.move.idx) {
              query =
                "INSERT INTO Moves (gid, squares, played, idx) VALUES " +
                "(" + id + ",?," + Date.now() + "," + obj.move.idx + ")";
              db.run(query, JSON.stringify(obj.move.squares));
              finishAndSendQuery();
            }
            else cb({ errmsg: "Wrong move index" });
          }
          else {
            if (ret.maxIdx < 2) cb({ errmsg: "Time not over" });
            else {
              // We also need the game cadence
              query =
                "SELECT cadence " +
                "FROM Games " +
                "WHERE id = " + id;
              db.get(query, (err2, ret2) => {
                const daysTc = parseInt(ret2.cadence.match(/^[0-9]+/)[0]);
                if (Date.now() - ret.lastPlayed > daysTc * 24 * 3600 * 1000)
                  finishAndSendQuery();
                else cb({ errmsg: "Time not over" });
              });
            }
          }
        });
      }
      else finishAndSendQuery();
      // NOTE: chat and delchat are mutually exclusive
      if (!!obj.chat) {
        const query =
          "INSERT INTO Chats (gid, msg, name, added) VALUES ("
            + id + ",?,'" + obj.chat.name + "'," + Date.now() + ")";
        db.run(query, obj.chat.msg);
      }
      else if (obj.delchat) {
        const query =
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
        const query =
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
        "SELECT id, created, cadence, score " +
        "FROM Games";
      db.all(query, (err, games) => {
        query =
          "SELECT gid, count(*) AS nbMoves, MAX(played) AS lastMaj " +
          "FROM Moves " +
          "GROUP BY gid";
        db.all(query, (err2, mstats) => {
          // Reorganize moves data to avoid too many array lookups:
          let movesGroups = {};
          mstats.forEach(ms => {
            movesGroups[ms.gid] = {
              nbMoves: ms.nbMoves,
              lastMaj: ms.lastMaj
            };
          });
          // Remove games still not really started,
          // with no action in the last 2 weeks, or result != '*':
          let toRemove = [];
          let lostOnTime = [ [], [] ];
          games.forEach(g => {
            if (
              (
                !movesGroups[g.id] &&
                (g.score != '*' || tsNow - g.created > 14*day)
              )
              ||
              (
                !!movesGroups[g.id] &&
                movesGroups[g.id].nbMoves == 1 &&
                (g.score != '*' || tsNow - movesGroups[g.id].lastMaj > 14*day)
              )
            ) {
              toRemove.push(g.id);
            }
            // Set score if lost on time and >= 2 moves:
            else if (
              g.score == '*' &&
              !!movesGroups[g.id] &&
              movesGroups[g.id].nbMoves >= 2 &&
              tsNow - movesGroups[g.id].lastMaj >
                // cadence in days * nb seconds per day:
                parseInt(g.cadence.slice(0, -1), 10) * day
            ) {
              lostOnTime[movesGroups[g.id].nbMoves % 2].push(g.id);
            }
          });
          if (toRemove.length > 0) GameModel.remove(toRemove);
          if (lostOnTime.some(l => l.length > 0)) {
            db.parallelize(function() {
              for (let i of [0, 1]) {
                if (lostOnTime[i].length > 0) {
                  const score = (i == 0 ? "0-1" : "1-0");
                  const query =
                    "UPDATE Games " +
                    "SET score = '" + score + "', scoreMsg = 'Time' " +
                    "WHERE id IN (" + lostOnTime[i].join(',') + ")";
                  db.run(query);
                }
              }
            });
          }
        });
      });
    });
  }

};

module.exports = GameModel;
