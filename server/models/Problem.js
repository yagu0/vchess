var db = require("../utils/database");

/*
 * Structure:
 *   id: integer
 *   added: datetime
 *   uid: user id (int)
 *   vid: variant id (int)
 *   fen: varchar (optional)
 *   instruction: text
 *   solution: text
 */

const ProblemModel =
{
  checkProblem: function(p)
  {
    if (!p.id.toString().match(/^[0-9]+$/))
      return "Wrong problem ID";
    if (!p.vid.toString().match(/^[0-9]+$/))
      return "Wrong variant ID";
    if (!p.fen.match(/^[a-zA-Z0-9, /-]*$/))
      return "Bad FEN string";
    return "";
  },

  create: function(p, cb)
  {
    db.serialize(function() {
      const query =
        "INSERT INTO Problems " +
        "(added, uid, vid, fen, instruction, solution) " +
          "VALUES " +
        "(" + Date.now() + "," + p.uid + "," + p.vid + ",'" + p.fen  + "',?,?)";
      db.run(query, [p.instruction,p.solution], function(err) {
        return cb(err, {pid: this.lastID});
      });
    });
  },

  getAll: function(cb)
  {
    db.serialize(function() {
      const query =
        "SELECT * " +
        "FROM Problems";
      db.all(query, (err,problems) => {
        return cb(err, problems);
      });
    });
  },

  getOne: function(id, cb)
  {
    db.serialize(function() {
      const query =
        "SELECT * " +
        "FROM Problems " +
        "WHERE id = " + id;
      db.get(query, (err,problem) => {
        return cb(err, problem);
      });
    });
  },

  update: function(prob, cb)
  {
    db.serialize(function() {
      let query =
        "UPDATE Problems " +
        "SET " +
          "vid = " + prob.vid + "," +
          "fen = '" + prob.fen + "'," +
          "instruction = ?," +
          "solution = ? " +
        "WHERE id = " + prob.id;
      db.run(query, [prob.instruction,prob.solution], cb);
    });
  },

  remove: function(id)
  {
    db.serialize(function() {
      const query =
        "DELETE FROM Problems " +
        "WHERE id = " + id;
      db.run(query);
    });
  },

  safeRemove: function(id, uid, cb)
  {
    db.serialize(function() {
      const query =
        "SELECT 1 " +
        "FROM Problems " +
        "WHERE id = " + id + " AND uid = " + uid;
      db.get(query, (err,prob) => {
        if (!prob)
          return cb({errmsg: "Not your problem"});
        ProblemModel.remove(id);
        cb(null);
      });
    });
  },
}

module.exports = ProblemModel;
