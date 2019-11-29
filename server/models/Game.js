var db = require("../utils/database");

/*
 * Structure table Games:
 *   id: game id (int)
 *   vid: integer (variant id)
 *   fenStart: varchar (initial position)
 *   fen: varchar (current position)
 *   timeControl: string
 *   score: varchar (result)
 *
 * Structure table Players:
 *   gid: ref game id
 *   uid: ref user id
 *   color: character
 *   rtime: real (remaining time)
 *
 * Structure table Moves:
 *   gid: ref game id
 *   move: varchar (description)
 *   message: text
 *   played: datetime
 *   idx: integer
 *   color: character
 */

const GameModel =
{
	create: function(vid, fen, timeControl, players, cb)
	{
		db.serialize(function() {
			let query =
				"INSERT INTO Games (vid, fen, timeControl) " +
				"VALUES (" + vid + ",'" + fen + "'," + timeControl + ")";
			db.run(insertQuery, err => {
				if (!!err)
					return cb(err);
        players.forEach(p => {
          query =
            "INSERT INTO Players VALUES " +
            // Remaining time = -1 means "unstarted"
            "(" + this.lastID + "," + p.id + "," + p.color + ", -1)";
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
			let query =
				"SELECT v.name AS vname, g.fen, g.fenStart, g.score " +
				"FROM Games g " +
				"JOIN Variants v " +
				"  ON g.vid = v.id "
				"WHERE id = " + id;
			db.get(query, (err,gameInfo) => {
				if (!!err)
					return cb(err);
				query =
					"SELECT p.uid AS id, p.color, p.rtime, u.name " +
					"FROM Players p " +
					"JOIN Users u " +
					"  ON p.uid = u.id " +
					"WHERE p.gid = " + id;
				db.run(query, (err2,players) => {
					if (!!err2)
						return cb(err2);
					query =
						"SELECT move AS desc, message, played, idx, color " +
						"FROM Moves " +
						"WHERE gid = " + id;
					db.run(query, (err3,moves) => {
						if (!!err3)
							return cb(err3);
						const game = {
							id: id,
							vname: gameInfo.vname,
							fenStart: gameInfo.fenStart,
							fen: gameInfo.fen,
							score: gameInfo.score,
							players: players,
							moves: moves,
						};
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
			db.run(query, (err,gameIds) => {
				if (!!err)
					return cb(err);
        gameIds = gameIds || []; //might be empty
				let gameArray = [];
				gameIds.forEach(gidRow => {
					GameModel.getOne(gidRow["gid"], (err2,game) => {
						if (!!err2)
							return cb(err2);
						gameArray.push(game);
					});
				});
				return cb(null, gameArray);
			});
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
}

module.exports = GameModel;
