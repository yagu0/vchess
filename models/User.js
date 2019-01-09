var db = require("../utils/database");
var maild = require("../utils/mailer.js");
var TokenGen = require("../utils/tokenGenerator");

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

// User creation
exports.create = function(name, email, notify, callback)
{
	if (!notify)
		notify = false; //default
	db.serialize(function() {
		db.run(
			"INSERT INTO Users " +
			"(name, email, notify) VALUES " +
			"(" + name + "," + email + "," + notify + ")");
	});
}

// Find one user (by id, name, email, or token)
exports.getOne = function(by, value, cb)
{
	const delimiter = (typeof value === "string" ? "'" : "");
	db.serialize(function() {
		db.get(
			"SELECT * FROM Users " +
			"WHERE " + by + " = " + delimiter + value + delimiter,
			callback);
	});
}

/////////
// MODIFY

exports.setLoginToken = function(token, uid, cb)
{
	db.serialize(function() {
		db.run(
			"UPDATE Users " +
			"SET loginToken = " + token + " AND loginTime = " + Date.now() + " " +
			"WHERE id = " + uid);
	});
}

// Set session token only if empty (first login)
// TODO: weaker security (but avoid to re-login everywhere after each logout)
exports.trySetSessionToken = function(uid, cb)
{
	// Also empty the login token to invalidate future attempts
	db.serialize(function() {
		db.get(
			"SELECT sessionToken " +
			"FROM Users " +
			"WHERE id = " + uid, (err,token) => {
				if (!!err)
					return cb(err);
				const newToken = token || TokenGen.generate(params.token.length);
				db.run(
					"UPDATE Users " +
					"SET loginToken = NULL " +
					(!token ? "AND sessionToken = " + newToken + " " : "") +
					"WHERE id = " + uid);
				cb(null, newToken);
		});
	});
}

exports.updateSettings = function(user, cb)
{
	db.serialize(function() {
		db.run(
			"UPDATE Users " +
			"SET name = " + user.name +
			" AND email = " + user.email +
			" AND notify = " + user.notify + " " +
			"WHERE id = " + user._id);
	});
}
