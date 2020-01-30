var db = require("../utils/database");

/*
 * Structure table Games:
 *   id: game id (int)
 *   vid: integer (variant id)
 *   fenStart: varchar (initial position)
 *   fen: varchar (current position)
 *   timeControl: string
 *   score: varchar (result)
 *   created: datetime
 *
 * Structure table Players:
 *   gid: ref game id
 *   uid: ref user id
 *   color: character
 *
 * Structure table Moves:
 *   gid: ref game id
 *   squares: varchar (description)
 *   message: text
 *   played: datetime
 *   idx: integer
 */

const GameModel =
{
	create: function(vid, fen, timeControl, players, cb)
	{
		db.serialize(function() {
			let query =
				"INSERT INTO Games"
        + " (vid, fenStart, fen, score, timeControl, created, drawOffer)"
        + " VALUES (" + vid + ",'" + fen + "','" + fen + "','*','"
        + timeControl + "'," + Date.now() + "," + false + ")";
      db.run(query, function(err) {
        if (!!err)
          return cb(err);
        players.forEach((p,idx) => {
          const color = (idx==0 ? "w" : "b");
          query =
            "INSERT INTO Players VALUES " +
            "(" + this.lastID + "," + p.id + ",'" + color + "')";
          db.run(query);
        });
        cb(null, {gid: this.lastID});
			});
		});
	},

	// TODO: queries here could be async, and wait for all to complete
	getOne: function(id, cb)
	{
		db.serialize(function() {
      // TODO: optimize queries?
			let query =
				"SELECT g.id, g.vid, g.fen, g.fenStart, g.timeControl, g.score, " +
          "v.name AS vname " +
				"FROM Games g " +
        "JOIN Variants v " +
        "  ON g.vid = v.id " +
				"WHERE g.id = " + id;
			db.get(query, (err,gameInfo) => {
				if (!!err)
					return cb(err);
				query =
					"SELECT p.uid, p.color, u.name " +
					"FROM Players p " +
          "JOIN Users u " +
          "  ON p.uid = u.id " +
					"WHERE p.gid = " + id;
				db.all(query, (err2,players) => {
					if (!!err2)
						return cb(err2);
					query =
						"SELECT squares, message, played, idx " +
						"FROM Moves " +
						"WHERE gid = " + id;
					db.all(query, (err3,moves) => {
						if (!!err3)
							return cb(err3);
						const game = Object.assign({},
              gameInfo,
						  {
							  players: players,
							  moves: moves
              }
            );
						return cb(null, game);
					});
				});
			});
		});
	},

	getByUser: function(uid, excluded, cb)
	{
		db.serialize(function() {
			// Next query is fine because a player appear at most once in a game
			const query =
				"SELECT gid " +
				"FROM Players " +
				"WHERE uid " + (excluded ? "<>" : "=") + " " + uid;
			db.all(query, (err,gameIds) => {
				if (!!err)
					return cb(err);
        gameIds = gameIds || []; //might be empty
				let gameArray = [];
				for (let i=0; i<gameIds.length; i++)
				{
					GameModel.getOne(gameIds[i]["gid"], (err2,game) => {
						if (!!err2)
							return cb(err2);
						gameArray.push(game);
						// Call callback function only when gameArray is complete:
						if (i == gameIds.length - 1)
							return cb(null, gameArray);
					});
				}
			});
		});
	},

  getPlayers: function(id, cb)
  {
    db.serialize(function() {
      const query =
        "SELECT id " +
        "FROM Players " +
        "WHERE gid = " + id;
      db.all(query, (err,players) => {
        return cb(err, players);
      });
    });
  },

  // obj can have fields move, message, fen, drawOffer and/or score
  update: function(id, obj)
  {
		db.parallelize(function() {
      let query =
        "UPDATE Games " +
        "SET ";
      if (!!obj.message)
        query += "message = message || ' ' || '" + obj.message + "',";
      if (!!obj.drawOffer)
        query += "drawOffer = " + obj.drawOffer + ",";
      if (!!obj.fen)
        query += "fen = '" + obj.fen + "',";
      if (!!obj.score)
        query += "score = '" + obj.score + "',";
      query = query.slice(0,-1); //remove last comma
      query += " WHERE id = " + id;
      db.run(query);
      if (!!obj.move)
      {
        const m = obj.move;
        query =
          "INSERT INTO Moves (gid, squares, played, idx) VALUES " +
          "(" + id + ",'" + JSON.stringify(m.squares) + "',"
            + m.played + "," + m.idx + ")";
        db.run(query);
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
		});
	},

  cleanGamesDb: function()
  {
    const tsNow = Date.now();
    // 86400000 = 24 hours in milliseconds
    const day = 86400000;
    db.serialize(function() {
      let query =
        "SELECT id,score " +
        "FROM Games ";
      db.all(query, (err,games) => {
        games.forEach(g => {
          query =
            "SELECT max(played) AS lastMaj " +
            "FROM Moves " +
            "WHERE gid = " + g.id;
          db.get(query, (err2,updated) => {
            if (!updated && tsNow - g.created > 7*day)
              return GameModel.remove(g.id);
            const lastMaj = updated.lastMaj;
            if (g.score != "*" && tsNow - lastMaj > 7*day ||
              g.score == "*" && tsNow - lastMaj > 91*day)
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
