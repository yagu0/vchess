const db = require("../utils/database");
const UserModel = require("./User");

/*
 * Structure:
 *   id: integer
 *   added: datetime
 *   uid: user id (int)
 *   target: recipient id (optional)
 *   vid: variant id (int)
 *   fen: varchar (optional)
 *   cadence: string (3m+2s, 7d+1d ...)
 */

const ChallengeModel =
{
  checkChallenge: function(c)
  {
    if (!c.vid.toString().match(/^[0-9]+$/))
      return "Wrong variant ID";
    if (!c.cadence.match(/^[0-9dhms +]+$/))
      return "Wrong characters in time control";
    if (!c.fen.match(/^[a-zA-Z0-9, /-]*$/))
      return "Bad FEN string";
    if (!!c.to)
      return UserModel.checkNameEmail({name: c.to});
    return "";
  },

  // fen cannot be undefined
  create: function(c, cb)
  {
    db.serialize(function() {
      const query =
        "INSERT INTO Challenges " +
        "(added, uid, " + (!!c.to ? "target, " : "") + "vid, fen, cadence) " +
          "VALUES " +
        "(" + Date.now() + "," + c.uid + "," + (!!c.to ? c.to + "," : "") +
          c.vid + ",'" + c.fen + "','" + c.cadence + "')";
      db.run(query, function(err) {
        return cb(err, {cid: this.lastID});
      });
    });
  },

  getOne: function(id, cb)
  {
    db.serialize(function() {
      const query =
        "SELECT * " +
        "FROM Challenges " +
        "WHERE id = " + id;
      db.get(query, (err,challenge) => {
        return cb(err, challenge);
      });
    });
  },

  // All challenges except where target is defined and not me,
  // and I'm not the sender.
  getByUser: function(uid, cb)
  {
    db.serialize(function() {
      const query =
        "SELECT * " +
        "FROM Challenges " +
        "WHERE target IS NULL" +
          " OR uid = " + uid +
          " OR target = " + uid;
      db.all(query, (err,challenges) => {
        return cb(err, challenges);
      });
    });
  },

  remove: function(id)
  {
    db.serialize(function() {
      const query =
        "DELETE FROM Challenges " +
        "WHERE id = " + id;
      db.run(query);
    });
  },

  safeRemove: function(id, uid, cb)
  {
    db.serialize(function() {
      const query =
        "SELECT 1 " +
        "FROM Challenges " +
        "WHERE id = " + id + " AND uid = " + uid;
      db.get(query, (err,chall) => {
        if (!chall)
          return cb({errmsg: "Not your challenge"});
        ChallengeModel.remove(id);
        cb(null);
      });
    });
  },
}

module.exports = ChallengeModel;
