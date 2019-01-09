var db = require("../utils/database");

/*
 * Structure:
 *   _id: integer
 *   name: varchar
 *   description: varchar
 */

exports.getByName = function(name, callback)
{
	db.serialize(function() {
		const query =
			"SELECT * FROM Variants " +
			"WHERE name='" + name + "'";
		db.get(query, callback);
	});
}

exports.getAll = function(callback)
{
	db.serialize(function() {
		const query = "SELECT * FROM Variants";
		db.all(query, callback);
	});
}

//create, update, delete: directly in DB
