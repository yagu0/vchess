var db = require("../utils/database");

/*
 * Structure:
 *   id: integer
 *   name: varchar
 *   description: varchar
 */

const VariantModel =
{
	// This is duplicated in client. TODO: really required here?
	NbPlayers:
	{
		"Alice": [2,3,4],
		"Antiking": [2,3,4],
		"Atomic": [2,3,4],
		"Baroque": [2,3,4],
		"Berolina": [2,4],
		"Checkered": [2,3,4],
		"Chess960": [2,3,4],
		"Crazyhouse": [2,3,4],
		"Dark": [2,3,4],
		"Extinction": [2,3,4],
		"Grand": [2],
		"Losers": [2,3,4],
		"Magnetic": [2],
		"Marseille": [2],
		"Switching": [2,3,4],
		"Upsidedown": [2],
		"Wildebeest": [2],
		"Zen": [2,3,4],
	},

	getByName: function(name, callback)
	{
		db.serialize(function() {
			const query =
				"SELECT * " +
				"FROM Variants " +
				"WHERE name='" + name + "'";
			db.get(query, callback);
		});
	},

	getAll: function(callback)
	{
		db.serialize(function() {
			const query =
				"SELECT * " +
				"FROM Variants";
			db.all(query, callback);
		});
	},

	//create, update, delete: directly in DB
}

module.exports = VariantModel;
