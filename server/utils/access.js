var UserModel = require("../models/User");

module.exports =
{
	// Prevent access to "users pages"
	logged: function(req, res, next) {
		const callback = () => {
			if (!loggedIn)
				return res.json({errmsg: "Not logged in"});
			next();
		};
		let loggedIn = undefined;
		if (!req.cookies.token)
		{
			loggedIn = false;
			callback();
		}
		else
		{
			UserModel.getOne("sessionToken", req.cookies.token, function(err, user) {
				if (!!user)
				{
					req.userId = user.id;
					req.userName = user.name;
					loggedIn = true;
				}
				else
				{
					// Token in cookies presumably wrong: erase it
					res.clearCookie("token");
					res.clearCookie("id");
					res.clearCookie("name");
					loggedIn = false;
				}
				callback();
			});
		}
	},

	// Prevent access to "anonymous pages"
	unlogged: function(req, res, next) {
		// Just a quick heuristic, which should be enough
		const loggedIn = !!req.cookies.token;
		if (loggedIn)
			return res.json({errmsg: "Already logged in"});
		next();
	},

	// Prevent direct access to AJAX results
	ajax: function(req, res, next) {
    if (!req.xhr)
			return res.json({errmsg: "Unauthorized access"});
		next();
	},

	// Check for errors before callback (continue page loading). TODO: better name.
	checkRequest: function(res, err, out, msg, cb) {
		if (!!err)
			return res.json({errmsg: err.errmsg || err.toString()});
		if (!out
			|| (Array.isArray(out) && out.length == 0)
			|| (typeof out === "object" && Object.keys(out).length == 0))
		{
			return res.json({errmsg: msg});
		}
		cb();
	},
}
