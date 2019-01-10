// AJAX methods to get, create, update or delete a problem

let router = require("express").Router();
const access = require("../utils/access");
const ProblemModel = require("../models/Problem");
const sanitizeHtml = require('sanitize-html');
const MaxNbProblems = 20;

// Get one problem
router.get("/problems/:vname([a-zA-Z0-9]+)/:pnum([0-9]+)", access.ajax, (req,res) => {
	const vname = req.params["vname"];
	const pnum = req.params["pnum"];
	ProblemModel.getOne(vname, pnum, (err,problem) => {
		if (!!err)
			return res.json(err);
		return res.json({problem: problem});
	});
});

// Fetch N previous or next problems
router.get("/problems/:vname([a-zA-Z0-9]+)", access.ajax, (req,res) => {
	const vname = req.params["vname"];
	const directionStr = (req.query.direction == "forward" ? ">" : "<");
	const lastDt = req.query.last_dt;
	const type = req.query.type;
	if (!lastDt.match(/[0-9]+/))
		return res.json({errmsg: "Bad timestamp"});
	if (!["others","mine"].includes(type))
		return res.json({errmsg: "Bad type"});
	ProblemModel.fetchN(vname, req.userId, type, directionStr, lastDt, MaxNbProblems,
		(err,problems) => {
			if (!!err)
				return res.json(err);
			return res.json({problems: problems});
		}
	);
});

function sanitizeUserInput(fen, instructions, solution)
{
	if (!fen.match(/^[a-zA-Z0-9, /-]*$/))
		return "Bad characters in FEN string";
	instructions = sanitizeHtml(instructions);
	solution = sanitizeHtml(solution);
	if (instructions.length == 0)
		return "Empty instructions";
	if (solution.length == 0)
		return "Empty solution";
	return {
		fen: fen,
		instructions: instructions,
		solution: solution
	};
}

// Upload a problem (sanitize inputs)
router.post("/problems/:vname([a-zA-Z0-9]+)", access.logged, access.ajax, (req,res) => {
	const vname = req.params["vname"];
	const s = sanitizeUserInput(req.body["fen"], req.body["instructions"], req.body["solution"]);
	if (typeof s === "string")
		return res.json({errmsg: s});
  ProblemModel.create(vname, s.fen, s.instructions, s.solution);
	res.json({});
});

// Update a problem (also sanitize inputs)
router.put("/problems/:id([0-9]+)", access.logged, access.ajax, (req,res) => {
	const pid = req.params["id"]; //problem ID
	const s = sanitizeUserInput(req.body["fen"], req.body["instructions"], req.body["solution"]);
	if (typeof s === "string")
		return res.json({errmsg: s});
	ProblemModel.update(pid, req.userId, fen, instructions, solution);
	res.json({});
});

// Delete a problem
router.delete("/problems/:id([0-9]+)", access.logged, access.ajax, (req,res) => {
	const pid = req.params["id"]; //problem ID
  ProblemModel.delete(pid, req.userId);
	res.json({});
});

module.exports = router;
