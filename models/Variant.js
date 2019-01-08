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
		db.get(
			"SELECT * FROM Variants " +
			"WHERE name='" + name + "'",
			callback);
	});
}

exports.getAll = function(callback)
{
	db.serialize(function() {
		db.all("SELECT * FROM Variants", callback);
	});
}

//create, update, delete: directly in DB
