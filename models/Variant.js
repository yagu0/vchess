var db = require("../utils/database");

/*
 * Structure:
 *   id: integer
 *   name: varchar
 *   description: varchar
 */

const VariantModel =
{
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
