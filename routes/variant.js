let router = require("express").Router();
const createError = require('http-errors');
const sqlite3 = require('sqlite3');
const DbPath = __dirname.replace("/routes", "/db/vchess.sqlite");
const db = new sqlite3.Database(DbPath);
const selectLanguage = require(__dirname.replace("/routes", "/utils/language.js"));

router.get("/:variant([a-zA-Z0-9]+)", (req,res,next) => {
	const vname = req.params["variant"];
	db.serialize(function() {
		db.all("SELECT * FROM Variants WHERE name='" + vname + "'", (err,variant) => {
			if (!!err)
				return next(err);
			if (!variant || variant.length==0)
				return next(createError(404));
			res.render('variant', {
				title: vname + ' Variant',
				variant: vname,
				lang: selectLanguage(req, res),
			});
		});
	});
});

// Load a rules page (AJAX)
router.get("/rules/:variant([a-zA-Z0-9]+)", (req,res) => {
	if (!req.xhr)
		return res.json({errmsg: "Unauthorized access"});
	const lang = selectLanguage(req, res);
	res.render("rules/" + req.params["variant"] + "/" + lang);
});

module.exports = router;
