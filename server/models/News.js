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
        cb(err, { id: this.lastID });
      });
    });
  },

  getNext: function(cursor, cb)
  {
    db.serialize(function() {
      const query =
        "SELECT * " +
        "FROM News " +
        "WHERE added < " + cursor + " " +
        "ORDER BY added DESC " +
        "LIMIT 10"; //TODO: 10 currently hard-coded
      db.all(query, (err,newsList) => {
        cb(err, newsList);
      });
    });
  },

  getTimestamp: function(cb)
  {
    db.serialize(function() {
      const query =
        "SELECT added " +
        "FROM News " +
        "ORDER BY added DESC " +
        "LIMIT 1";
      db.get(query, (err,ts) => {
        cb(err, ts);
      });
    });
  },

  update: function(news)
  {
    db.serialize(function() {
      let query =
        "UPDATE News " +
        "SET content = ? " +
        "WHERE id = " + news.id;
      db.run(query, news.content);
    });
  },

  remove: function(id)
  {
    db.serialize(function() {
      const query =
        "DELETE FROM News " +
        "WHERE id = " + id;
      db.run(query);
    });
  },
}

module.exports = NewsModel;
