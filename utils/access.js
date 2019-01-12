module.exports =
{
	// Prevent access to "users pages"
	logged: function(req, res, next) {
		if (req.userId == 0)
			return res.redirect("/");
		next();
	},

	// Prevent access to "anonymous pages"
	unlogged: function(req, res, next) {
		if (req.userId > 0)
			return res.redirect("/");
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
