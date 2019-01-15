// AJAX methods to get, create, update or delete a problem

let router = require("express").Router();
const access = require("../utils/access");
const ProblemModel = require("../models/Problem");
const sanitizeHtml = require('sanitize-html');
const MaxNbProblems = 20;

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

// Get one problem (TODO: vid unused, here for URL de-ambiguification)
router.get("/problems/:vid([0-9]+)/:id([0-9]+)", access.ajax, (req,res) => {
	const pid = req.params["id"];
	ProblemModel.getOne(pid, (err,problem) => {
		if (!!err)
			return res.json(err);
		return res.json({problem: problem});
	});
});

// Fetch N previous or next problems
router.get("/problems/:vid([0-9]+)", access.ajax, (req,res) => {
	const vid = req.params["vid"];
	const directionStr = (req.query.direction == "forward" ? ">" : "<");
	const lastDt = req.query.last_dt;
	const type = req.query.type;
	if (!lastDt.match(/[0-9]+/))
		return res.json({errmsg: "Bad timestamp"});
	if (!["others","mine"].includes(type))
		return res.json({errmsg: "Bad type"});
	ProblemModel.fetchN(vid, req.userId, type, directionStr, lastDt, MaxNbProblems,
		(err,problems) => {
			if (!!err)
				return res.json(err);
			return res.json({problems: problems});
		}
	);
});

// Upload a problem (sanitize inputs)
router.post("/problems/:vid([0-9]+)", access.logged, access.ajax, (req,res) => {
	const vid = req.params["vid"];
	const s = sanitizeUserInput(req.body["fen"], req.body["instructions"], req.body["solution"]);
	if (typeof s === "string")
		return res.json({errmsg: s});
  ProblemModel.create(vid, s.fen, s.instructions, s.solution);
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
