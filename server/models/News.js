const db = require("../utils/database");

/*
 * Structure:
 *   id: integer
 *   added: datetime
 *   uid: user id (int)
 *   content: text
 */

const NewsModel =
{
  create: function(content, uid, cb)
  {
    db.serialize(function() {
      const query =
        "INSERT INTO News " +
        "(added, uid, content) " +
          "VALUES " +
        "(" + Date.now() + "," + uid + ",?)";
      db.run(query, content, function(err) {
        return cb(err, {nid: this.lastID});
      });
    });
  },

  getNext: function(cursor, cb)
  {
    db.serialize(function() {
      const query =
        "SELECT * " +
        "FROM News " +
        "WHERE id > " + cursor + " " +
        "LIMIT 10"; //TODO: 10 currently hard-coded
      db.all(query, (err,newsList) => {
        return cb(err, newsList);
      });
    });
  },

  update: function(news, cb)
  {
    db.serialize(function() {
      let query =
        "UPDATE News " +
        "SET content = ? " +
        "WHERE id = " + news.id;
      db.run(query, news.content, cb);
    });
  },

  remove: function(id, cb)
  {
    db.serialize(function() {
      const query =
        "DELETE FROM News " +
        "WHERE id = " + id;
      db.run(query, cb);
    });
  },
}

module.exports = NewsModel;
