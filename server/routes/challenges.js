let router = require("express").Router();
const access = require("../utils/access");
const ChallengeModel = require("../models/Challenge");
const UserModel = require("../models/User"); //for name check
const params = require("../config/parameters");

router.post("/challenges", access.logged, access.ajax, (req,res) => {
  if (ChallengeModel.checkChallenge(req.body.chall))
  {
    let challenge =
    {
      fen: req.body.chall.fen,
      cadence: req.body.chall.cadence,
      randomness: req.body.chall.randomness,
      vid: req.body.chall.vid,
      uid: req.userId,
      to: req.body.chall.to, //string: user name (may be empty)
    };
    const insertChallenge = () => {
      ChallengeModel.create(challenge, (err,ret) => {
        res.json(err || {cid:ret.cid});
      });
    };
    if (req.body.chall.to)
    {
      UserModel.getOne("name", challenge.to, (err,user) => {
        if (!!err || !user)
          res.json(err || {errmsg: "Typo in player name"});
        else
        {
          challenge.to = user.id; //ready now to insert challenge
          insertChallenge();
          if (user.notify)
            UserModel.notify(
              user,
              "New challenge: " + params.siteURL + "/#/?disp=corr");
        }
      });
    }
    else
      insertChallenge();
  }
});

router.get("/challenges", access.ajax, (req,res) => {
  const uid = req.query.uid;
  if (uid.match(/^[0-9]+$/))
  {
    ChallengeModel.getByUser(uid, (err,challenges) => {
      res.json(err || {challenges:challenges});
    });
  }
});

router.delete("/challenges", access.logged, access.ajax, (req,res) => {
  const cid = req.query.id;
  if (cid.match(/^[0-9]+$/))
  {
    ChallengeModel.safeRemove(cid, req.userId);
    res.json({});
  }
});

module.exports = router;
