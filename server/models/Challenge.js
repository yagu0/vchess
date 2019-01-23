var db = require("../utils/database");

/*
 * Structure table Challenges:
 *   id: integer
 *   added: datetime
 *   uid: user id (int)
 *   vid: variant id (int)
 *   nbPlayers: integer
 *   fen: varchar (optional)
 *   mainTime: integer
 *   addTime: integer
 *
 * Structure table WillPlay:
 *   cid: ref challenge id
 *   uid: ref user id
 */

const ChallengeModel =
{
	checkChallenge: function(c)
	{
		const vid = parseInt(c.vid);
		if (isNaN(vid) || vid <= 0)
			return "Please select a variant";

		const mainTime = parseInt(c.mainTime);
		const increment = parseInt(c.increment);
		if (isNaN(mainTime) || mainTime <= 0)
			return "Main time should be strictly positive";
		if (isNaN(increment) || increment < 0)
			return "Increment must be positive";

		// Basic alphanumeric check for players names
		let playerCount = 0;
		for (p of c.players)
		{
			if (p.name.length > 0)
			{
				if (!p.name.match(/^[\w]+$/))
					return "Wrong characters in players names";
				playerCount++;
			}
		}

		if (playerCount > 0 && playerCount != c.nbPlayers-1)
			return "None, or all of the opponent names must be filled"

		// Just characters check on server:
		if (!c.fen.match(/^[a-zA-Z0-9, /-]*$/))
			return "Bad FEN string";
	},

	// fen cannot be undefined; TODO: generate fen on server instead
	create: function(c, cb)
	{
		db.serialize(function() {
			let query =
				"INSERT INTO Challenges " +
				"(added, uid, vid, nbPlayers, fen, mainTime, addTime) VALUES " +
				"(" + Date.now() + "," + c.uid + "," + c.vid + "," + c.nbPlayers +
					",'" + c.fen + "'," + c.mainTime + "," + c.increment + ")";
			db.run(query, err => {
				if (!!err)
					return cb(err);
				db.get("SELECT last_insert_rowid() AS rowid", (err2,lastId) => {
					query =
						"INSERT INTO WillPlay VALUES " +
						"(" + lastId["rowid"] + "," + c.uid + ")";
						db.run(query, (err,ret) => {
							cb(err, lastId); //all we need is the challenge ID
						});
				});
			});
		});
	},

	getOne: function(id, cb)
	{
		db.serialize(function() {
			let query =
				"SELECT * " +
				"FROM Challenges c " +
				"JOIN Variants v " +
				"  ON c.vid = v.id "
				"WHERE id = " + id;
			db.get(query, (err,challengeInfo) => {
				if (!!err)
					return cb(err);
				query =
					"SELECT w.uid AS id, u.name " +
					"FROM WillPlay w " +
					"JOIN Users u " +
					"  ON w.uid = u.id " +
					"WHERE w.cid = " + id;
				db.run(query, (err2,players) => {
					if (!!err2)
						return cb(err2);
					const challenge = {
						id: id,
						uid: challengeInfo.uid,
						vname: challengeInfo.name,
						added: challengeInfo.added,
						nbPlayers: challengeInfo.nbPlayers,
						players: players, //currently in
						fen: challengeInfo.fen,
						mainTime: challengeInfo.mainTime,
						increment: challengeInfo.addTime,
					};
					return cb(null, challenge);
				});
			});
		});
	},

	getByUser: function(uid, cb)
	{
		db.serialize(function() {
			const query =
				"SELECT cid " +
				"FROM WillPlay " +
				"WHERE uid = " + uid;
			db.run(query, (err,challIds) => {
				if (!!err)
					return cb(err);
				let challenges = [];
				challIds.forEach(cidRow => {
					ChallengeModel.getOne(cidRow["cid"], (err2,chall) => {
						if (!!err2)
							return cb(err2);
						challenges.push(chall);
					});
				});
				return cb(null, challenges);
			});
		});
	},

	remove: function(id)
	{
		db.parallelize(function() {
			let query =
				"DELETE FROM Challenges " +
				"WHERE id = " + id;
			db.run(query);
			query =
				"DELETE FROM WillPlay " +
				"WHERE cid = " + id;
			db.run(query);
		});
	},
}

module.exports = ChallengeModel;
