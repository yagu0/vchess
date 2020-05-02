let router = require("express").Router();
const access = require("../utils/access");
const params = require("../config/parameters");
const ProblemModel = require("../models/Problem");
const sanitizeHtml_pkg = require('sanitize-html');

const allowedTags = [
  'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol', 'li', 'b',
  'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div', 'table',
  'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre'
];
function sanitizeHtml(text) {
  return sanitizeHtml_pkg(text, { allowedTags: allowedTags });
}

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
  const probId = req.query["id"];
  const cursor = req.query["cursor"];
  if (!!probId && !!probId.match(/^[0-9]+$/)) {
    ProblemModel.getOne(probId, (err, problem) => {
      res.json(err || {problem: problem});
    });
  } else if (!!cursor && !!cursor.match(/^[0-9]+$/)) {
    const onlyMine = (req.query["mode"] == "mine");
    const uid = parseInt(req.query["uid"]);
    ProblemModel.getNext(uid, onlyMine, cursor, (err, problems) => {
      res.json(err || { problems: problems });
    });
  }
});

router.put("/problems", access.logged, access.ajax, (req,res) => {
  let obj = req.body.prob;
  if (ProblemModel.checkProblem(obj)) {
    obj.instruction = sanitizeHtml(obj.instruction);
    obj.solution = sanitizeHtml(obj.solution);
    ProblemModel.safeUpdate(obj, req.userId, params.devs);
  }
  res.json({});
});

router.delete("/problems", access.logged, access.ajax, (req,res) => {
  const pid = req.query.id;
  if (pid.toString().match(/^[0-9]+$/))
    ProblemModel.safeRemove(pid, req.userId, params.devs);
  res.json({});
});

module.exports = router;
