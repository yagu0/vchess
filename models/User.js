var db = require("../utils/database");
var maild = require("../utils/mailer.js");

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
			"WHERE " + by " = " + delimiter + value + delimiter,
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

exports.setSessionToken = function(token, uid, cb)
{
	// Also empty the login token to invalidate future attempts
	db.serialize(function() {
		db.run(
			"UPDATE Users " +
			"SET loginToken = NULL AND sessionToken = " + token + " " +
			"WHERE id = " + uid);
	});
}

exports.updateSettings = function(name, email, notify, cb)
{
	db.serialize(function() {
		db.run(
			"UPDATE Users " +
			"SET name = " + name +
			" AND email = " + email +
			" AND notify = " + notify + " " +
			"WHERE id = " + uid);
	});
}
