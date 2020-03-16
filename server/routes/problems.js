let router = require("express").Router();
const access = require("../utils/access");
const ProblemModel = require("../models/Problem");
const sanitizeHtml = require('sanitize-html');

router.post("/problems", access.logged, access.ajax, (req,res) => {
  if (ProblemModel.checkProblem(req.body.prob)) {
    const problem = {
      vid: req.body.prob.vid,
      fen: req.body.prob.fen,
      uid: req.userId,
      instruction: sanitizeHtml(req.body.prob.instruction),
      solution: sanitizeHtml(req.body.prob.solution),
    };
    ProblemModel.create(problem, (err, ret) => {
      res.json(err || ret);
    });
  }
  else
    res.json({});
});

router.get("/problems", access.ajax, (req,res) => {
  const probId = req.query["pid"];
  if (probId && probId.match(/^[0-9]+$/)) {
    ProblemModel.getOne(req.query["pid"], (err,problem) => {
      res.json(err || {problem: problem});
    });
  } else {
    ProblemModel.getAll((err,problems) => {
      res.json(err || { problems: problems });
    });
  }
});

router.put("/problems", access.logged, access.ajax, (req,res) => {
  let obj = req.body.prob;
  if (ProblemModel.checkProblem(obj)) {
    obj.instruction = sanitizeHtml(obj.instruction);
    obj.solution = sanitizeHtml(obj.solution);
    ProblemModel.safeUpdate(obj, req.userId);
  }
  res.json({});
});

router.delete("/problems", access.logged, access.ajax, (req,res) => {
  const pid = req.query.id;
  if (pid.toString().match(/^[0-9]+$/))
    ProblemModel.safeRemove(pid, req.userId);
  res.json({});
});

module.exports = router;
