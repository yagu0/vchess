var db = require("../utils/database");
const UserModel = require("./User");

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

  // Remove challenges older than 1 month, and 1to1 older than 2 days
  removeOld: function()
  {
    const tsNow = Date.now();
    // 86400000 = 24 hours in milliseconds
    const day = 86400000;
    db.serialize(function() {
      const query =
        "SELECT id, target, added " +
        "FROM Challenges";
      db.all(query, (err, challenges) => {
        challenges.forEach(c => {
          if ((!c.target && tsNow - c.added > 30*day) ||
            (!!c.target && tsNow - c.added > 2*day))
          {
            db.run("DELETE FROM Challenges WHERE id = " + c.id);
          }
        });
      });
    });
  },
}

module.exports = ChallengeModel;
