var db = require("../utils/database");

/*
 * Structure:
 *   id: problem number (int)
 *   uid: user id (int)
 *   vid: variant id (int)
 *   added: timestamp
 *   instructions: text
 *   solution: text
 */

exports.create = function(uid, vid, fen, instructions, solution, cb)
{
	db.serialize(function() {
		const insertQuery =
			"INSERT INTO Problems (added, uid, vid, fen, instructions, solution) " +
			"VALUES (" + Date.now() + "," + uid + "," + vid + ",'" + fen + "',?,?)";
		db.run(insertQuery, [instructions, solution], err => {
			if (!!err)
				return cb(err);
			db.get("SELECT last_insert_rowid() AS rowid", cb);
		});
	});
}

exports.getOne = function(id, callback)
{
	db.serialize(function() {
		const query =
			"SELECT * " +
			"FROM Problems " +
			"WHERE id = " + id;
		db.get(query, callback);
	});
}

exports.fetchN = function(vid, uid, type, directionStr, lastDt, MaxNbProblems, callback)
{
	db.serialize(function() {
		let typeLine = "";
		if (uid > 0)
			typeLine = "AND uid " + (type=="others" ? "!=" : "=") + " " + uid;
		const query =
			"SELECT * FROM Problems " +
			"WHERE vid = " + vid +
			"  AND added " + directionStr + " " + lastDt + " " + typeLine + " " +
			"ORDER BY added " + (directionStr=="<" ? "DESC " : "") +
			"LIMIT " + MaxNbProblems;
		db.all(query, callback);
	});
}

// TODO: update fails (but insert is OK)
exports.update = function(id, uid, fen, instructions, solution, cb)
{
	db.serialize(function() {
		const query =
			"UPDATE Problems SET " +
				"fen = '" + fen + "', " +
				"instructions = ?, " +
				"solution = ? " +
			"WHERE id = " + id + " AND uid = " + uid;
		db.run(query, [instructions,solution], cb);
	});
}

exports.remove = function(id, uid)
{
	db.serialize(function() {
		const query =
			"DELETE FROM Problems " +
			"WHERE id = " + id + " AND uid = " + uid;
		db.run(query);
	});
}
