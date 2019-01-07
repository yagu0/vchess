let router = require("express").Router();
const sqlite3 = require('sqlite3');//.verbose();
const DbPath = __dirname.replace("/routes", "/db/vchess.sqlite");
const db = new sqlite3.Database(DbPath);
const selectLanguage = require(__dirname.replace("/routes", "/utils/language.js"));

router.get('/', function(req, res, next) {
	db.serialize(function() {
		db.all("SELECT * FROM Variants", (err,variants) => {
			if (!!err)
				return next(err);
			res.render('index', {
				title: 'club',
				variantArray: variants,
				lang: selectLanguage(req, res),
			});
		});
	});
});

module.exports = router;
