const db = require("../utils/database");
const UserModel = require("./User");

/*
 * Structure table Games:
 *   id: game id (int)
 *   vid: integer (variant id)
 *   fenStart: varchar (initial position)
 *   fen: varchar (current position)
 *   cadence: string
 *   score: varchar (result)
 *   scoreMsg: varchar ("Time", "Mutual agreement"...)
 *   created: datetime
 *   drawOffer: char ('w','b' or '' for none)
 *
 * Structure table Players:
 *   gid: ref game id
 *   uid: ref user id
 *   color: character
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
      g.fen.match(/^[a-zA-Z0-9, /-]*$/) &&
      g.players.length == 2 &&
      g.players.every(p => p.id.toString().match(/^[0-9]+$/))
    );
  },

  create: function(vid, fen, cadence, players, cb)
  {
    db.serialize(function() {
      let query =
        "INSERT INTO Games " +
        "(vid, fenStart, fen, score, cadence, created, drawOffer) " +
        "VALUES " +
        "(" + vid + ",'" + fen + "','" + fen + "','*','" + cadence + "'," + Date.now() + ",'')";
      db.run(query, function(err) {
        if (err)
          cb(err)
        else
        {
          players.forEach((p,idx) => {
            const color = (idx==0 ? "w" : "b");
            query =
              "INSERT INTO Players VALUES " +
              "(" + this.lastID + "," + p.id + ",'" + color + "')";
            db.run(query);
          });
          cb(null, {gid: this.lastID});
        }
      });
    });
  },

  // TODO: some queries here could be async
  getOne: function(id, light, cb)
  {
    // NOTE: ignoring errors (shouldn't happen at this stage)
    db.serialize(function() {
      let query =
        "SELECT g.id, g.vid, g.fen, g.fenStart, g.cadence, g.created, g.score, " +
          "g.scoreMsg, g.drawOffer, v.name AS vname " +
        "FROM Games g " +
        "JOIN Variants v " +
        "  ON g.vid = v.id " +
        "WHERE g.id = " + id;
      db.get(query, (err,gameInfo) => {
        query =
          "SELECT p.uid, p.color, u.name " +
          "FROM Players p " +
          "JOIN Users u " +
          "  ON p.uid = u.id " +
          "WHERE p.gid = " + id;
        db.all(query, (err2,players) => {
          if (light)
          {
            const game = Object.assign({},
              gameInfo,
              {players: players}
            );
            cb(null, game);
          }
          else
          {
            // Full game requested:
            query =
              "SELECT squares, played, idx " +
              "FROM Moves " +
              "WHERE gid = " + id;
            db.all(query, (err3,moves) => {
              query =
                "SELECT msg, name, added " +
                "FROM Chats " +
                "WHERE gid = " + id;
              db.all(query, (err4,chats) => {
                const game = Object.assign({},
                  gameInfo,
                  {
                    players: players,
                    moves: moves,
                    chats: chats,
                  }
                );
                cb(null, game);
              });
            });
          }
        });
      });
    });
  },

  // For display on MyGames or Hall: no need for moves or chats
  getByUser: function(uid, excluded, cb)
  {
    db.serialize(function() {
      let query = "";
      if (uid == 0)
      {
        // Special case anonymous user: show all games
        query =
          "SELECT id AS gid " +
          "FROM Games";
      }
      else
      {
        // Registered user:
        query =
          "SELECT gid " +
          "FROM Players " +
          "GROUP BY gid " +
          "HAVING COUNT(uid = " + uid + " OR NULL) " +
          (excluded ? " = 0" : " > 0");
      }
      db.all(query, (err,gameIds) => {
        if (err || gameIds.length == 0)
          cb(err, []);
        else
        {
          let gameArray = [];
          let gCounter = 0;
          for (let i=0; i<gameIds.length; i++)
          {
            GameModel.getOne(gameIds[i]["gid"], true, (err2,game) => {
              gameArray.push(game);
              gCounter++; //TODO: let's hope this is atomic?!
              // Call callback function only when gameArray is complete:
              if (gCounter == gameIds.length)
                cb(null, gameArray);
            });
          }
        }
      });
    });
  },

  getPlayers: function(id, cb)
  {
    db.serialize(function() {
      const query =
        "SELECT uid " +
        "FROM Players " +
        "WHERE gid = " + id;
      db.all(query, (err,players) => {
        return cb(err, players);
      });
    });
  },

  checkGameUpdate: function(obj)
  {
    // Check all that is possible (required) in obj:
    return (
      (
        !obj.move || (
          obj.move.played.toString().match(/^[0-9]+$/) &&
          obj.move.idx.toString().match(/^[0-9]+$/)
        )
      ) && (
        !obj.drawOffer || obj.drawOffer.match(/^[wbtn]$/)
      ) && (
        !obj.fen || obj.fen.match(/^[a-zA-Z0-9, /-]*$/)
      ) && (
        !obj.score || obj.score.match(/^[012?*\/-]+$/)
      ) && (
        !obj.scoreMsg || obj.scoreMsg.match(/^[a-zA-Z ]+$/)
      ) && (
        !obj.chat || UserModel.checkNameEmail({name: obj.chat.name})
      )
    );
  },

  // obj can have fields move, chat, fen, drawOffer and/or score + message
  update: function(id, obj)
  {
    db.parallelize(function() {
      let query =
        "UPDATE Games " +
        "SET ";
      let modifs = "";
      // NOTE: if drawOffer is set, we should check that it's player's turn
      // A bit overcomplicated. Let's trust the client on that for now...
      if (obj.drawOffer)
      {
        if (obj.drawOffer == "n") //Special "None" update
          obj.drawOffer = "";
        modifs += "drawOffer = '" + obj.drawOffer + "',";
      }
      if (obj.fen)
        modifs += "fen = '" + obj.fen + "',";
      if (obj.score)
        modifs += "score = '" + obj.score + "',";
      if (obj.scoreMsg)
        modifs += "scoreMsg = '" + obj.scoreMsg + "',";
      modifs = modifs.slice(0,-1); //remove last comma
      if (modifs.length > 0)
      {
        query += modifs + " WHERE id = " + id;
        db.run(query);
      }
      if (obj.move)
      {
        const m = obj.move;
        query =
          "INSERT INTO Moves (gid, squares, played, idx) VALUES " +
          "(" + id + ",?," + m.played + "," + m.idx + ")";
        db.run(query, JSON.stringify(m.squares));
      }
      if (obj.chat)
      {
        query =
          "INSERT INTO Chats (gid, msg, name, added) VALUES ("
            + id + ",?,'" + obj.chat.name + "'," + Date.now() + ")";
        db.run(query, obj.chat.msg);
      }
    });
  },

  remove: function(id)
  {
    db.parallelize(function() {
      let query =
        "DELETE FROM Games " +
        "WHERE id = " + id;
      db.run(query);
      query =
        "DELETE FROM Players " +
        "WHERE gid = " + id;
      db.run(query);
      query =
        "DELETE FROM Moves " +
        "WHERE gid = " + id;
      db.run(query);
      query =
        "DELETE FROM Chats " +
        "WHERE gid = " + id;
      db.run(query);
    });
  },

  cleanGamesDb: function()
  {
    const tsNow = Date.now();
    // 86400000 = 24 hours in milliseconds
    const day = 86400000;
    db.serialize(function() {
      let query =
        "SELECT id, created " +
        "FROM Games ";
      db.all(query, (err,games) => {
        games.forEach(g => {
          query =
            "SELECT count(*) as nbMoves, max(played) AS lastMaj " +
            "FROM Moves " +
            "WHERE gid = " + g.id;
          db.get(query, (err2,mstats) => {
            // Remove games still not really started,
            // with no action in the last 3 months:
            if ((mstats.nbMoves == 0 && tsNow - g.created > 91*day) ||
              (mstats.nbMoves == 1 && tsNow - mstats.lastMaj > 91*day))
            {
              GameModel.remove(g.id);
            }
          });
        });
      });
    });
  },
}

module.exports = GameModel;
