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
exports.create = function(vname, fen, instructions, solution)
{
	db.serialize(function() {
		const vidQuery =
			"SELECT id " +
			"FROM Variants " +
			"WHERE name = '" + vname + "'";
		db.get(vidQuery, (err,variant) => {
			const insertQuery =
				"INSERT INTO Problems (added, vid, fen, instructions, solution) VALUES " +
				"(" +
					Date.now() + "," +
					variant.id + "," +
					fen + "," +
					instructions + "," +
					solution +
				")";
			db.run(insertQuery);
		});
	});
}

exports.getById = function(id, callback)
{
	db.serialize(function() {
		const query =
			"SELECT * FROM Problems " +
			"WHERE id ='" + id + "'";
		db.get(query, callback);
	});
}

exports.getOne = function(vname, pid, callback)
{
	db.serialize(function() {
		const query =
			"SELECT * " +
			"FROM Problems " +
			"WHERE id = " + pid;
		db.get(query, callback);
	});
}

exports.fetchN = function(vname, uid, type, directionStr, lastDt, MaxNbProblems, callback)
{
	db.serialize(function() {
		let typeLine = "";
		if (uid > 0)
			typeLine = "AND id " + (type=="others" ? "!=" : "=") + " " + uid;
		const query =
			"SELECT * FROM Problems " +
			"WHERE vid = (SELECT id FROM Variants WHERE name = '" + vname + "') " +
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
