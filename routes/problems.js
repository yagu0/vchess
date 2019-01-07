let router = require("express").Router();
const sqlite3 = require('sqlite3');
const DbPath = __dirname.replace("/routes", "/db/vchess.sqlite");
const db = new sqlite3.Database(DbPath);
const sanitizeHtml = require('sanitize-html');
const MaxNbProblems = 20;

// Fetch N previous or next problems (AJAX)
router.get("/problems/:variant([a-zA-Z0-9]+)", (req,res) => {
	if (!req.xhr)
		return res.json({errmsg: "Unauthorized access"});
	const vname = req.params["variant"];
	const directionStr = (req.query.direction == "forward" ? ">" : "<");
	const lastDt = req.query.last_dt;
	if (!lastDt.match(/[0-9]+/))
		return res.json({errmsg: "Bad timestamp"});
	db.serialize(function() {
		const query = "SELECT * FROM Problems " +
			"WHERE variant='" + vname + "' " +
			"  AND added " + directionStr + " " + lastDt + " " +
			"ORDER BY added " + (directionStr=="<" ? "DESC " : "") +
			"LIMIT " + MaxNbProblems;
		db.all(query, (err,problems) => {
			if (!!err)
				return res.json(err);
			return res.json({problems: problems});
		});
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
	const instructions = sanitizeHtml(req.body["instructions"]).trim();
	const solution = sanitizeHtml(req.body["solution"]).trim();
	if (instructions.length == 0)
		return res.json({errmsg: "Empty instructions"});
	if (solution.length == 0)
		return res.json({errmsg: "Empty solution"});
	db.serialize(function() {
		let stmt = db.prepare("INSERT INTO Problems " +
			"(added,variant,fen,instructions,solution) VALUES (?,?,?,?,?)");
		stmt.run(timestamp, vname, fen, instructions, solution);
		stmt.finalize();
	});
  res.json({});
});

// TODO: edit, delete a problem

module.exports = router;
