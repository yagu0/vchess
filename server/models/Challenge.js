var db = require("../utils/database");

/*
 * Structure table Challenges:
 *   id: integer
 *   added: datetime
 *   uid: user id (int)
 *   vid: variant id (int)
 *   nbPlayers: integer
 *   fen: varchar (optional)
 *   timeControl: string (3m+2s, 7d+1d ...)
 *
 * Structure table WillPlay:
 *   cid: ref challenge id
 *   uid: ref user id
 *   yes: boolean (false means "not decided yet")
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

  initializeWillPlay: function(uids, cid, cb)
  {
    let query = "INSERT INTO WillPlay VALUES ";
    for (let i=0; i<uids.length; i++)
    {
      query += "(false," + cid + "," + uids[i] + ")";
      if (i < uids.length-1)
        query += ",";
    }
    db.run(query, cb);
  },

	// fen cannot be undefined
	create: function(c, cb)
	{
		db.serialize(function() {
			let query =
				"INSERT INTO Challenges " +
				"(added, uid, vid, nbPlayers, fen, timeControl) VALUES " +
				"(" + Date.now() + "," + c.uid + "," + c.vid + "," + c.nbPlayers +
					",'" + c.fen + "'," + c.timeControl + ")";
			db.run(query, err => {
				if (!!err)
					return cb(err);
				db.get("SELECT last_insert_rowid() AS rowid", (err2,lastId) => {
          query =
						"INSERT INTO WillPlay VALUES " +
						"(true," + lastId["rowid"] + "," + c.uid + ")";
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

  testfunc: function()
  {
    db.serialize(function() {
      db.run("DELETE * FROM TableTest", (err,ret) => {
        console.log(ret);
      });
    });
  },

	remove: function(id, uid)
	{
		db.serialize(function() {
			let query =
				"DELETE FROM Challenges " +
				"WHERE id = " + id + " AND uid = " + uid;
			db.run(query, (err,ret) => {
			  if (!err && ret >= 1)
        {
          // Also remove matching WillPlay entries if a challenge was deleted
          query =
				    "DELETE FROM WillPlay " +
				    "WHERE cid = " + id;
			    db.run(query);
        }
      });
		});
	},
}

module.exports = ChallengeModel;
