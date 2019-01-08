var db = require("../utils/database");

/*
 * Structure:
 *   _id: problem number (int)
 *   uid: user id (int)
 *   vid: variant id (int)
 *   added: timestamp
 *   instructions: text
 *   solution: text
 */

exports.create = function(vname, fen, instructions, solution)
{
	db.serialize(function() {
		db.get("SELECT id FROM Variants WHERE name = '" + vname + "'", (err,variant) => {
			db.run(
				"INSERT INTO Problems (added, vid, fen, instructions, solution) VALUES " +
				"(" +
					Date.now() + "," +
					variant._id + "," +
					fen + "," +
					instructions + "," +
					solution +
				")");
		});
	});
}

exports.getById = function(id, callback)
{
	db.serialize(function() {
		db.get(
			"SELECT * FROM Problems " +
			"WHERE id ='" + id + "'",
			callback);
	});
}

exports.fetchN = function(vname, directionStr, lastDt, MaxNbProblems, callback)
{
	db.serialize(function() {
		db.all(
			"SELECT * FROM Problems " +
			"WHERE vid = (SELECT id FROM Variants WHERE name = '" + vname + "') " +
			"  AND added " + directionStr + " " + lastDt + " " +
			"ORDER BY added " + (directionStr=="<" ? "DESC " : "") +
			"LIMIT " + MaxNbProblems,
			callback);
	});
}

exports.update = function(id, uid, fen, instructions, solution)
{
	db.serialize(function() {
		db.run(
			"UPDATE Problems " +
				"fen = " + fen + ", " +
				"instructions = " + instructions + ", " +
				"solution = " + solution + " " +
			"WHERE id = " + id + " AND uid = " + uid);
	});
}

exports.remove = function(id, uid)
{
	db.serialize(function() {
		db.run(
			"DELETE FROM Problems " +
			"WHERE id = " + id + " AND uid = " + uid);
	});
}
