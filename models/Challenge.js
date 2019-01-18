var db = require("../utils/database");

/*
 * Structure table Challenges:
 *   id: integer
 *   added: datetime
 *   uid: user id (int)
 *   vid: variant id (int)
 *   nbPlayers: integer
 *
 * Structure table WillPlay:
 *   cid: ref challenge id
 *   uid: ref user id
 */

exports.create = function(uid, vid, nbPlayers, cb)
{
	db.serialize({
		let query =
			"INSERT INTO Challenges (added, uid, vid, nbPlayers) " +
			"VALUES (" + Date.now() + "," + uid + "," + vid + "," + nbPlayers + ")";
		db.run(insertQuery, err => {
			if (!!err)
				return cb(err);
			db.get("SELECT last_insert_rowid() AS rowid", (err2,lastId) => {
				query =
					"INSERT INTO WillPlay VALUES " +
					"(" + lastId["rowid"] + "," + uid + ")";
					db.run(query, cb);
				});
			});
		});
	});
}

exports.getOne = function(id, cb)
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
					vname: challengeInfo.name,
					added: challengeInfo.added,
					nbPlayers: challengeInfo.nbPlayers,
					players: players, //currently in
				};
				return cb(null, challenge);
			});
		});
	});
}

exports.remove = function(id)
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
}
