var db = require("../utils/database");

/*
 * Structure:
 *   id: integer
 *   added: datetime
 *   uid: user id (int)
 *   target: recipient id (optional)
 *   vid: variant id (int)
 *   fen: varchar (optional)
 *   timeControl: string (3m+2s, 7d+1d ...)
 */

const ChallengeModel =
{
	checkChallenge: function(c)
	{
    if (!c.vid.match(/^[0-9]+$/))
			return "Wrong variant ID";

    if (!c.timeControl.match(/^[0-9dhms +]+$/))
      return "Wrong characters in time control";

		if (!c.fen.match(/^[a-zA-Z0-9, /-]+$/))
			return "Bad FEN string";
	},

	// fen cannot be undefined
	create: function(c, cb)
	{
		db.serialize(function() {
			let query =
				"INSERT INTO Challenges " +
				"(added, uid, " + (!!c.to ? "target, " : "") +
          "vid, fen, timeControl) VALUES " +
				"(" + Date.now() + "," + c.uid + "," + (!!c.to ? c.to + "," : "") +
          c.vid + ",'" + c.fen + "','" + c.timeControl + "')";
			db.run(query, err => {
				if (!!err)
					return cb(err);
				db.get("SELECT last_insert_rowid() AS rowid", (err2,lastId) => {
			    return cb(err2, lastId);
        });
      });
		});
	},

	getOne: function(id, cb)
	{
		db.serialize(function() {
			let query =
				"SELECT * " +
				"FROM Challenges " +
				"WHERE id = " + id;
			db.get(query, (err,challengeInfo) => {
				if (!!err)
					return cb(err);
        let condition = "";
        if (!!challengeInfo.to)
          condition = "IN (" + challengeInfo.uid + "," + challengeInfo.to + ")";
        else
          condition = "= " + challengeInfo.uid;
				query =
					"SELECT id, name " +
					"FROM Users " +
					"WHERE id " + condition;
				db.run(query, (err2,players) => {
					if (!!err2)
						return cb(err2);
					const challenge = {
						id: id,
						uid: challengeInfo.uid, //sender (but we don't know who ask)
						vid: challengeInfo.vid,
						added: challengeInfo.added,
						players: players, //sender + potential receiver
						fen: challengeInfo.fen,
						timeControl: challengeInfo.timeControl,
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
        challIds = challIds || [];
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

	remove: function(id, uid)
	{
		db.serialize(function() {
			let query =
        "SELECT 1 " +
        "FROM Challenges " +
        "WHERE id = " + id + " AND uid = " + uid;
      db.run(query, (err,rows) => {
        if (rows.length == 0)
          return res.json({errmsg: "Not your challenge"});
        query =
          "DELETE FROM Challenges " +
          "WHERE id = " + id;
        db.run(query);
      });
		});
	},
}

module.exports = ChallengeModel;
