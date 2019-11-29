var db = require("../utils/database");

/*
 * Structure:
 *   id: integer
 *   added: datetime
 *   uid: user id (int)
 *   target: recipient id (optional)
 *   vid: variant id (int)
 *   fen: varchar (optional)
 *   timeControl: string (3m+2s, 7d+1d ...)
 */

const ChallengeModel =
{
  checkChallenge: function(c)
  {
    if (!c.vid.toString().match(/^[0-9]+$/))
      return "Wrong variant ID";
    if (!c.timeControl.match(/^[0-9dhms +]+$/))
      return "Wrong characters in time control";
    if (!c.fen.match(/^[a-zA-Z0-9, /-]*$/))
      return "Bad FEN string";
    return "";
  },

  // fen cannot be undefined
  create: function(c, cb)
  {
    db.serialize(function() {
      const query =
        "INSERT INTO Challenges " +
        "(added, uid, " + (!!c.to ? "target, " : "") +
          "vid, fen, timeControl) VALUES " +
        "(" + Date.now() + "," + c.uid + "," + (!!c.to ? c.to + "," : "") +
          c.vid + ",'" + c.fen + "','" + c.timeControl + "')";
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

  // all challenges except where target is defined and not me
  getByUser: function(uid, cb)
  {
    db.serialize(function() {
      const query =
        "SELECT * " +
        "FROM Challenges " +
        "WHERE target IS NULL OR target = " + uid;
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
