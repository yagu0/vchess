const db = require("../utils/database");

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

const ProblemModel = {
  checkProblem: function(p) {
    return (
      p.id.toString().match(/^[0-9]+$/) &&
      p.vid.toString().match(/^[0-9]+$/) &&
      p.fen.match(/^[a-zA-Z0-9, /-]*$/)
    );
  },

  create: function(p, cb) {
    db.serialize(function() {
      const query =
        "INSERT INTO Problems " +
        "(added, uid, vid, fen, instruction, solution) " +
          "VALUES " +
        "(" + Date.now() + "," + p.uid + "," + p.vid + ",'" + p.fen  + "',?,?)";
      db.run(query, [p.instruction,p.solution], function(err) {
        cb(err, { id: this.lastID });
      });
    });
  },

  getNext: function(uid, onlyMine, cursor, cb) {
    let condition = "";
    if (onlyMine) condition = "AND uid = " + uid + " ";
    else if (!!uid) condition = "AND uid <> " + uid + " ";
    db.serialize(function() {
      const query =
        "SELECT * " +
        "FROM Problems " +
        "WHERE added < " + cursor + " " +
        condition +
        "ORDER BY added DESC " +
        "LIMIT 20"; //TODO: 20 is arbitrary
      db.all(query, (err, problems) => {
        cb(err, problems);
      });
    });
  },

  getOne: function(id, cb) {
    db.serialize(function() {
      const query =
        "SELECT * " +
        "FROM Problems " +
        "WHERE id = " + id;
      db.get(query, (err, problem) => {
        cb(err, problem);
      });
    });
  },

  safeUpdate: function(prob, uid, devs) {
    db.serialize(function() {
      let whereClause = "WHERE id = " + prob.id;
      if (!devs.includes(uid)) whereClause += " AND uid = " + uid;
      const query =
        "UPDATE Problems " +
        "SET " +
          "vid = " + prob.vid + "," +
          "fen = '" + prob.fen + "'," +
          "instruction = ?," +
          "solution = ? " +
        whereClause;
      db.run(query, [prob.instruction, prob.solution]);
    });
  },

  safeRemove: function(id, uid, devs) {
    db.serialize(function() {
      let whereClause = "WHERE id = " + prob.id;
      if (!devs.includes(uid)) whereClause += " AND uid = " + uid;
      const query =
        "DELETE FROM Problems " +
        whereClause;
      db.run(query);
    });
  },
}

module.exports = ProblemModel;
