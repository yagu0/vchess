let express = require('express');
let router = express.Router();
const createError = require('http-errors');
const sqlite3 = require('sqlite3');//.verbose();
const db = new sqlite3.Database('db/vchess.sqlite');
const sanitizeHtml = require('sanitize-html');

// Home
router.get('/', function(req, res, next) {
	db.serialize(function() {
		db.all("SELECT * FROM Variants", (err,variants) => {
			if (!!err)
				return next(err);
			res.render('index', {
				title: 'club',
				variantArray: variants, //JSON.stringify(variants)
			});
		});
	});
});

// Variant
router.get("/:vname([a-zA-Z0-9]+)", (req,res,next) => {
	const vname = req.params["vname"];
	db.serialize(function() {
		db.all("SELECT * FROM Variants WHERE name='" + vname + "'", (err,variant) => {
			if (!!err)
				return next(err);
			if (!variant || variant.length==0)
				return next(createError(404));
			db.all("SELECT * FROM Problems WHERE variant='" + vname + "'",
				(err2,problems) => {
					if (!!err2)
						return next(err2);
					res.render('variant', {
						title: vname + ' Variant',
						variant: vname,
						problemArray: problems,
					});
				}
			);
		});
	});
});

// Load a rules page (AJAX)
router.get("/rules/:variant([a-zA-Z0-9]+)", (req,res) => {
	if (!req.xhr)
		return res.json({errmsg: "Unauthorized access"});
	res.render("rules/" + req.params["variant"]);
});

// Fetch 10 previous or next problems (AJAX)
router.get("/problems/:variant([a-zA-Z0-9]+)", (req,res) => {
	if (!req.xhr)
		return res.json({errmsg: "Unauthorized access"});
	// TODO: next or previous: in params + timedate (of current oldest or newest)
});

// Upload a problem (AJAX)
router.post("/problems/:variant([a-zA-Z0-9]+)", (req,res) => {
	if (!req.xhr)
		return res.json({errmsg: "Unauthorized access"});
	const vname = req.params["variant"];
	
	// TODO: get parameters and sanitize them
	sanitizeHtml(req.body["fen"]); // [/a-z0-9 ]*
	sanitizeHtml(req.body["instructions"]);
	db.serialize(function() {
		let stmt = db.prepare("INSERT INTO Problems VALUES (?,?,?,?,?)");
		stmt.run(timestamp, vname, fen, instructions, solution);
		stmt.finalize();
	});
  res.json({});
});


module.exports = router;
