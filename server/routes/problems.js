// AJAX methods to get, create, update or delete a problem

let router = require("express").Router();
const access = require("../utils/access");
const ProblemModel = require("../models/Problem");
const sanitizeHtml = require('sanitize-html');

router.get("/problems", (req,res) => {
  const probId = req.query["pid"];
  if (!!probId)
  {
    if (!probId.match(/^[0-9]+$/))
      return res.json({errmsg: "Wrong problem ID"});
    ProblemModel.getOne(req.query["pid"], (err,problem) => {
      access.checkRequest(res, err, problem, "Problem not found", () => {
        res.json({problem: problem});
      });
    });
  }
  else
  {
    ProblemModel.getAll((err,problems) => {
      res.json(err || {problems:problems});
    });
  }
});

router.post("/problems", access.logged, access.ajax, (req,res) => {
  const error = ProblemModel.checkProblem(req.body.prob);
  if (!!error)
    return res.json({errmsg:error});
  const problem =
  {
    vid: req.body.prob.vid,
    fen: req.body.prob.fen,
    uid: req.userId,
    instruction: sanitizeHtml(req.body.prob.instruction),
    solution: sanitizeHtml(req.body.prob.solution),
  };
  ProblemModel.create(problem, (err,ret) => {
    return res.json(err || {pid:ret.pid});
  });
});

router.put("/problems", access.logged, access.ajax, (req,res) => {
  const pid = req.body.pid;
  let error = "";
  if (!pid.toString().match(/^[0-9]+$/))
    error = "Wrong problem ID";
  let obj = req.body.newProb;
  error = ProblemModel.checkProblem(obj);
  obj.instruction = sanitizeHtml(obj.instruction);
  obj.solution = sanitizeHtml(obj.solution);
  if (!!error)
    return res.json({errmsg: error});
  ProblemModel.update(pid, obj, (err) => {
    res.json(err || {});
  });
});

router.delete("/problems", access.logged, access.ajax, (req,res) => {
  const pid = req.query.id;
  if (!pid.match(/^[0-9]+$/))
    res.json({errmsg: "Bad problem ID"});
  ProblemModel.safeRemove(pid, req.userId, err => {
    res.json(err || {});
  });
});

module.exports = router;
