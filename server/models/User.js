var db = require("../utils/database");
var genToken = require("../utils/tokenGenerator");
var params = require("../config/parameters");
var sendEmail = require('../utils/mailer');

/*
 * Structure:
 *   _id: integer
 *   name: varchar
 *   email: varchar
 *   loginToken: token on server only
 *   loginTime: datetime (validity)
 *   sessionToken: token in cookies for authentication
 *   notify: boolean (send email notifications for corr games)
 */

const UserModel =
{
	checkNameEmail: function(o)
	{
		if (typeof o.name === "string")
		{
			if (o.name.length == 0)
				return "Empty name";
			if (!o.name.match(/^[\w]+$/))
				return "Bad characters in name";
		}
		if (typeof o.email === "string")
		{
			if (o.email.length == 0)
				return "Empty email";
			if (!o.email.match(/^[\w.+-]+@[\w.+-]+$/))
				return "Bad characters in email";
		}
	},

	// NOTE: parameters are already cleaned (in controller), thus no sanitization here
	create: function(name, email, notify, callback)
	{
		db.serialize(function() {
			const insertQuery =
				"INSERT INTO Users " +
				"(name, email, notify) VALUES " +
				"('" + name + "', '" + email + "', " + notify + ")";
			db.run(insertQuery, err => {
				if (!!err)
					return callback(err);
				db.get("SELECT last_insert_rowid() AS rowid", callback);
			});
		});
	},

	// Find one user (by id, name, email, or token)
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

	setLoginToken: function(token, uid, cb)
	{
		db.serialize(function() {
			const query =
				"UPDATE Users " +
				"SET loginToken = '" + token + "', loginTime = " + Date.now() + " " +
				"WHERE id = " + uid;
			db.run(query, cb);
		});
	},

	// Set session token only if empty (first login)
	// TODO: weaker security (but avoid to re-login everywhere after each logout)
	trySetSessionToken: function(uid, cb)
	{
		// Also empty the login token to invalidate future attempts
		db.serialize(function() {
			const querySessionToken =
				"SELECT sessionToken " +
				"FROM Users " +
				"WHERE id = " + uid;
			db.get(querySessionToken, (err,ret) => {
				if (!!err)
					return cb(err);
				const token = ret.sessionToken || genToken(params.token.length);
				const queryUpdate =
					"UPDATE Users " +
					"SET loginToken = NULL" +
					(!ret.sessionToken ? (", sessionToken = '" + token + "'") : "") + " " +
					"WHERE id = " + uid;
				db.run(queryUpdate);
				cb(null, token);
			});
		});
	},

	updateSettings: function(user, cb)
	{
		db.serialize(function() {
			const query =
				"UPDATE Users " +
				"SET name = '" + user.name + "'" +
				", email = '" + user.email + "'" +
				", notify = " + user.notify + " " +
				"WHERE id = " + user.id;
			db.run(query, cb);
		});
	},

  /////////////////
  // NOTIFICATIONS

  tryNotify: function(oppId, message)
  {
		UserModel.getOne("id", oppId, (err,opp) => {
      if (!err || !opp.notify)
        return; //error is ignored here (TODO: should be logged)
      const subject = "vchess.club - notification";
      const body = "Hello " + opp.name + "!\n" + message;
      sendEmail(params.mail.noreply, opp.email, subject, body, err => {
        res.json(err || {});
      });
    });
  }
}

// TODO: adapt
//exports.cleanUsersDb = function()
//{
//	var tsNow = new Date().getTime();
//	// 86400000 = 24 hours in milliseconds
//	var day = 86400000;
//
//	db.users.find({}, (err,userArray) => {
//		userArray.forEach( u => {
//			if ((u.sessionTokens.length==0 &&
//					u._id.getTimestamp().getTime() + day < tsNow) //unlogged
//				|| u.updated + 365*day < tsNow) //inactive for one year
//			{
//				db.users.remove({"_id": u._id});
//			}
//		});
//	});
//}

module.exports = UserModel;
