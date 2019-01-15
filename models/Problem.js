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

// TODO: callback ?
exports.create = function(vid, fen, instructions, solution)
{
	db.serialize(function() {
		const query =
			"INSERT INTO Problems (added, vid, fen, instructions, solution) VALUES " +
			"(" +
				Date.now() + "," +
				vid + "," +
				fen + "," +
				instructions + "," +
				solution +
			")";
		db.run(query);
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
			typeLine = "AND id " + (type=="others" ? "!=" : "=") + " " + uid;
		const query =
			"SELECT * FROM Problems " +
			"WHERE vid = " + vid +
			"  AND added " + directionStr + " " + lastDt + " " + typeLine + " " +
			"ORDER BY added " + (directionStr=="<" ? "DESC " : "") +
			"LIMIT " + MaxNbProblems;
		db.all(query, callback);
	});
}

exports.update = function(id, uid, fen, instructions, solution)
{
	db.serialize(function() {
		const query =
			"UPDATE Problems " +
				"fen = " + fen + ", " +
				"instructions = " + instructions + ", " +
				"solution = " + solution + " " +
			"WHERE id = " + id + " AND uid = " + uid;
		db.run(query);
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
