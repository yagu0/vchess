// AJAX methods to get, create, update or delete a challenge

let router = require("express").Router();
const access = require("../utils/access");
const ChallengeModel = require("../models/Challenge");
const UserModel = require("../models/User"); //for name check

router.get("/challenges", (req,res) => {
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
    timeControl: req.body.chall.timeControl,
    vid: req.body.chall.vid,
    uid: req.userId,
    to: req.body.chall.to, //string: user name (may be empty)
  };
  const insertChallenge = () => {
    ChallengeModel.create(challenge, (err) => {
      if (!!err)
        return res.json(err);
    });
  };
  if (!!req.body.chall.to)
  {
    UserModel.getOne("name", challenge.to, (err,user) => {
      if (!!err || !user)
        return res.json(err | {errmsg: "Typo in player name"});
      challenge.to = user.id; //ready now to insert challenge
    });
    insertChallenge();
  }
  else
    insertChallenge();
});

router.delete("/challenges", access.logged, access.ajax, (req,res) => {
  const cid = req.query.id;
  ChallengeModel.remove(cid, req.userId, err => {
    res.json(err || {}); //TODO: just "return err" because is empty if no errors
  });
});

module.exports = router;
