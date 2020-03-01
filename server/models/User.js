const db = require("../utils/database");
const genToken = require("../utils/tokenGenerator");
const params = require("../config/parameters");
const sendEmail = require('../utils/mailer');

/*
 * Structure:
 *   _id: integer
 *   name: varchar
 *   email: varchar
 *   loginToken: token on server only
 *   loginTime: datetime (validity)
 *   sessionToken: token in cookies for authentication
 *   notify: boolean (send email notifications for corr games)
 *   created: datetime
 */

const UserModel =
{
  checkNameEmail: function(o)
  {
    return (
      (!o.name || o.name.match(/^[\w]+$/)) &&
      (!o.email || o.email.match(/^[\w.+-]+@[\w.+-]+$/))
    );
  },

  create: function(name, email, notify, cb)
  {
    db.serialize(function() {
      const query =
        "INSERT INTO Users " +
        "(name, email, notify, created) VALUES " +
        "('" + name + "','" + email + "'," + notify + "," + Date.now() + ")";
      db.run(query, function(err) {
        cb(err, {uid: this.lastID});
      });
    });
  },

  // Find one user by id, name, email, or token
  getOne: function(by, value, cb)
  {
    const delimiter = (typeof value === "string" ? "'" : "");
    db.serialize(function() {
      const query =
        "SELECT * " +
        "FROM Users " +
        "WHERE " + by + " = " + delimiter + value + delimiter;
      db.get(query, cb);
    });
  },

  getByIds: function(ids, cb) {
    db.serialize(function() {
      const query =
        "SELECT id, name " +
        "FROM Users " +
        "WHERE id IN (" + ids + ")";
      db.all(query, cb);
    });
  },

  /////////
  // MODIFY

  setLoginToken: function(token, uid)
  {
    db.serialize(function() {
      const query =
        "UPDATE Users " +
        "SET loginToken = '" + token + "',loginTime = " + Date.now() + " " +
        "WHERE id = " + uid;
      db.run(query);
    });
  },

  // Set session token only if empty (first login)
  // NOTE: weaker security (but avoid to re-login everywhere after each logout)
  // TODO: option would be to reset all tokens periodically, e.g. every 3 months
  trySetSessionToken: function(uid, cb)
  {
    db.serialize(function() {
      let query =
        "SELECT sessionToken " +
        "FROM Users " +
        "WHERE id = " + uid;
      db.get(query, (err,ret) => {
        const token = ret.sessionToken || genToken(params.token.length);
        query =
          "UPDATE Users " +
          // Also empty the login token to invalidate future attempts
          "SET loginToken = NULL" +
          (!ret.sessionToken ? (", sessionToken = '" + token + "'") : "") + " " +
          "WHERE id = " + uid;
        db.run(query);
        cb(token);
      });
    });
  },

  updateSettings: function(user)
  {
    db.serialize(function() {
      const query =
        "UPDATE Users " +
        "SET name = '" + user.name + "'" +
        ", email = '" + user.email + "'" +
        ", notify = " + user.notify + " " +
        "WHERE id = " + user.id;
      db.run(query);
    });
  },

  /////////////////
  // NOTIFICATIONS

  notify: function(user, message)
  {
    const subject = "vchess.club - notification";
    const body = "Hello " + user.name + "!" + `
` + message;
    sendEmail(params.mail.noreply, user.email, subject, body);
  },

  tryNotify: function(id, message)
  {
    UserModel.getOne("id", id, (err,user) => {
      if (!err && user.notify)
        UserModel.notify(user, message);
    });
  },

  ////////////
  // CLEANING

  cleanUsersDb: function()
  {
    const tsNow = Date.now();
    // 86400000 = 24 hours in milliseconds
    const day = 86400000;
    db.serialize(function() {
      const query =
        "SELECT id, sessionToken, created, name, email " +
        "FROM Users";
      db.all(query, (err, users) => {
        users.forEach(u => {
          // Remove unlogged users for > 24h
          if (!u.sessionToken && tsNow - u.created > day)
          {
            notify(
              u,
              "Your account has been deleted because " +
              "you didn't log in for 24h after registration"
            );
            db.run("DELETE FROM Users WHERE id = " + u.id);
          }
        });
      });
    });
  },
}

module.exports = UserModel;
