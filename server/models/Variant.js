const db = require("../utils/database");

/*
 * Structure:
 *   id: integer
 *   name: varchar
 *   display: varchar
 *   groupe: integer
 *   description: varchar
 *   noProblems: boolean
 */

const VariantModel = {

  getAll: function(callback) {
    db.serialize(function() {
      const query =
        "SELECT * " +
        "FROM Variants";
      db.all(query, callback);
    });
  }

  //create, update, delete: directly in DB

};

module.exports = VariantModel;
