// AJAX methods to get, create, update or delete a challenge

let router = require("express").Router();
const access = require("../utils/access");
const ChallengeModel = require("../models/Challenge");
const UserModel = require("../models/User"); //for name check
const params = require("../config/parameters");

router.get("/challenges", (req,res) => {
  if (!req.query["uid"].match(/^[0-9]+$/))
    res.json({errmsg: "Bad user ID"});
  ChallengeModel.getByUser(req.query["uid"], (err,challenges) => {
    res.json(err || {challenges:challenges});
  });
});

router.post("/challenges", access.logged, access.ajax, (req,res) => {
  const error = ChallengeModel.checkChallenge(req.body.chall);
  if (!!error)
    return res.json({errmsg:error});
  let challenge =
  {
    fen: req.body.chall.fen,
    cadence: req.body.chall.cadence,
    vid: req.body.chall.vid,
    uid: req.userId,
    to: req.body.chall.to, //string: user name (may be empty)
  };
  const insertChallenge = () => {
    ChallengeModel.create(challenge, (err,ret) => {
      return res.json(err || {cid:ret.cid});
    });
  };
  if (!!req.body.chall.to)
  {
    UserModel.getOne("name", challenge.to, (err,user) => {
      if (!!err || !user)
        return res.json(err | {errmsg: "Typo in player name"});
      challenge.to = user.id; //ready now to insert challenge
      insertChallenge();
      if (user.notify)
        UserModel.notify(
          user,
          "New challenge: " + params.siteURL + "/#/?disp=corr");
    });
  }
  else
    insertChallenge();
});

router.delete("/challenges", access.logged, access.ajax, (req,res) => {
  const cid = req.query.id;
  if (!cid.match(/^[0-9]+$/))
    res.json({errmsg: "Bad challenge ID"});
  ChallengeModel.safeRemove(cid, req.userId, err => {
    res.json(err || {}); //TODO: just "return err" because is empty if no errors
  });
});

module.exports = router;
