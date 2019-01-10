var db = require("../utils/database");
var maild = require("../utils/mailer.js");
var TokenGen = require("../utils/tokenGenerator");
var params = require("../config/parameters");

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

// TODO: consider sanitizing http://www.unixwiz.net/techtips/sql-injection.html
// But parameters are supposed to already be cleaned (in controller).

// User creation
exports.create = function(name, email, notify, callback)
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
}

// Find one user (by id, name, email, or token)
exports.getOne = function(by, value, cb)
{
	const delimiter = (typeof value === "string" ? "'" : "");
	db.serialize(function() {
		const query =
			"SELECT * " +
			"FROM Users " +
			"WHERE " + by + " = " + delimiter + value + delimiter;
		db.get(query, cb);
	});
}

/////////
// MODIFY

exports.setLoginToken = function(token, uid, cb)
{
	db.serialize(function() {
		const query =
			"UPDATE Users " +
			"SET loginToken = '" + token + "', loginTime = " + Date.now() + " " +
			"WHERE id = " + uid;
		db.run(query, cb);
	});
}

// Set session token only if empty (first login)
// TODO: weaker security (but avoid to re-login everywhere after each logout)
exports.trySetSessionToken = function(uid, cb)
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
			const token = ret.sessionToken || TokenGen.generate(params.token.length);
			const queryUpdate =
				"UPDATE Users " +
				"SET loginToken = NULL" +
				(!ret.sessionToken ? (", sessionToken = '" + token + "'") : "") + " " +
				"WHERE id = " + uid;
			db.run(queryUpdate);
			cb(null, token);
		});
	});
}

exports.updateSettings = function(user, cb)
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
}
