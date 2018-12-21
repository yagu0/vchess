let express = require('express');
let router = express.Router();
const createError = require('http-errors');
const sqlite3 = require('sqlite3');//.verbose();
const db = new sqlite3.Database('db/vchess.sqlite');
const sanitizeHtml = require('sanitize-html');

const supportedLang = ["fr","en"];
function selectLanguage(req, res)
{
	// If preferred language already set:
	if (!!req.cookies["lang"])
		return req.cookies["lang"];

	// Else: search and set it
	const langString = req.headers["accept-language"];
	let langArray = langString
		.replace(/;q=[0-9.]+/g, "") //priority
		.replace(/-[A-Z]+/g, "") //region (skipped for now...)
		.split(",") //may have some duplicates, but removal is too costly
	let bestLang = "en"; //default: English
	for (let lang of langArray)
	{
		if (supportedLang.includes(lang))
		{
			bestLang = lang;
			break;
		}
	}
	// Cookie expires in 183 days (expressed in milliseconds)
	res.cookie('lang', bestLang, { maxAge: 183*24*3600*1000 });
	return bestLang;
}

// Home
router.get('/', function(req, res, next) {
	db.serialize(function() {
		db.all("SELECT * FROM Variants", (err,variants) => {
			if (!!err)
				return next(err);
			res.render('index', {
				title: 'club',
				variantArray: variants,
				lang: selectLanguage(req, res),
				languages: supportedLang,
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
			// TODO (later...) get only n=100(?) most recent problems
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
	const lang = selectLanguage(req, res);
	res.render("rules/" + req.params["variant"] + "/" + lang);
});

// Fetch 10 previous or next problems (AJAX)
router.get("/problems/:variant([a-zA-Z0-9]+)", (req,res) => {
	if (!req.xhr)
		return res.json({errmsg: "Unauthorized access"});
	// TODO: next or previous: in params + timedate (of current oldest or newest)
	db.serialize(function() {
		//TODO
	});
});

// Upload a problem (AJAX)
router.post("/problems/:variant([a-zA-Z0-9]+)", (req,res) => {
	if (!req.xhr)
		return res.json({errmsg: "Unauthorized access"});
	const vname = req.params["variant"];
	const timestamp = Date.now();
	// Sanitize them
	const fen = req.body["fen"];
	if (!fen.match(/^[a-zA-Z0-9, /-]*$/))
		return res.json({errmsg: "Bad characters in FEN string"});
	const instructions = sanitizeHtml(req.body["instructions"]);
	const solution = sanitizeHtml(req.body["solution"]);
	db.serialize(function() {
		let stmt = db.prepare("INSERT INTO Problems " +
			"(added,variant,fen,instructions,solution) VALUES (?,?,?,?,?)");
		stmt.run(timestamp, vname, fen, instructions, solution);
		stmt.finalize();
	});
  res.json({});
});

module.exports = router;
