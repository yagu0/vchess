const db = require("../utils/database");
const UserModel = require("./User");

/*
 * Structure:
 *   id: integer
 *   added: datetime
 *   uid: user id (int)
 *   target: recipient id (optional)
 *   vid: variant id (int)
 *   options: varchar
 *   fen: varchar (optional)
 *   cadence: string (3m+2s, 7d ...)
 *   options: string (js object)
 */

const ChallengeModel = {

  checkChallenge: function(c) {
    return (
      c.vid.toString().match(/^[0-9]+$/) &&
      c.cadence.match(/^[0-9dhms +]+$/) &&
      c.fen.match(/^[a-zA-Z0-9, /-]*$/) &&
      (!c.to || UserModel.checkNameEmail({ name: c.to }))
    );
  },

  create: function(c, cb) {
    db.serialize(function() {
      const query =
        "INSERT INTO Challenges " +
          "(added, uid, " + (c.to ? "target, " : "") +
          "vid, options, fen, cadence) " +
        "VALUES (" + Date.now() + "," + c.uid + "," + (c.to ? c.to + "," : "")
          + c.vid + ",?,'" + c.fen + "','" + c.cadence + "')";
      db.run(query, c.options, function(err) {
        cb(err, { id: this.lastID });
      });
    });
  },

  // All challenges related to user with ID uid
  getByUser: function(uid, cb) {
    db.serialize(function() {
      const query =
        "SELECT * " +
        "FROM Challenges " +
        "WHERE target IS NULL" +
          " OR uid = " + uid +
          " OR target = " + uid;
      db.all(query, (err, challenges) => {
        cb(err, challenges);
      });
    });
  },

  remove: function(id) {
    db.serialize(function() {
      const query =
        "DELETE FROM Challenges " +
        "WHERE id = " + id;
      db.run(query);
    });
  },

  safeRemove: function(id, uid) {
    db.serialize(function() {
      const query =
        "SELECT 1 " +
        "FROM Challenges " +
        "WHERE id = " + id + " " +
          // Condition: I'm the sender or the target
          "AND (uid = " + uid + " OR target = " + uid + ")";
      db.get(query, (err,chall) => {
        if (!err && chall)
          ChallengeModel.remove(id);
      });
    });
  }

};

module.exports = ChallengeModel;
