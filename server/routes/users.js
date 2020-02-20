let router = require("express").Router();
const UserModel = require('../models/User');
const sendEmail = require('../utils/mailer');
const genToken = require("../utils/tokenGenerator");
const access = require("../utils/access");
const params = require("../config/parameters");

router.post('/register', access.unlogged, access.ajax, (req,res) => {
  const name = req.body.name;
  const email = req.body.email;
  const notify = !!req.body.notify;
  if (UserModel.checkNameEmail({name: name, email: email}))
  {
    UserModel.create(name, email, notify, (err,ret) => {
      if (err)
        res.json({errmsg: "User creation failed. Try again"});
      else
      {
        const user = {
          id: ret.uid,
          name: name,
          email: email,
        };
        setAndSendLoginToken("Welcome to " + params.siteURL, user, res);
        res.json({});
      }
    });
  }
});

// NOTE: this method is safe because the sessionToken must be guessed
router.get("/whoami", access.ajax, (req,res) => {
  const callback = (user) => {
    res.json({
      name: user.name,
      email: user.email,
      id: user.id,
      notify: user.notify,
    });
  };
  const anonymous = {name:"", email:"", id:0, notify:false};
  if (!req.cookies.token)
    callback(anonymous);
  else if (req.cookies.token.match(/^[a-z0-9]+$/))
  {
    UserModel.getOne("sessionToken", req.cookies.token, (err, user) => {
      callback(user || anonymous);
    });
  }
});

// NOTE: this method is safe because only IDs and names are returned
router.get("/users", access.ajax, (req,res) => {
  const ids = req.query["ids"];
  if (ids.match(/^([0-9]+,?)+$/)) //NOTE: slightly too permissive
  {
    UserModel.getByIds(ids, (err,users) => {
      res.json({users:users});
    });
  }
});

router.put('/update', access.logged, access.ajax, (req,res) => {
  const name = req.body.name;
  const email = req.body.email;
  if (UserModel.checkNameEmail({name: name, email: email}));
  {
    const user = {
      id: req.userId,
      name: name,
      email: email,
      notify: !!req.body.notify,
    };
    UserModel.updateSettings(user);
    res.json({});
  }
});

// Authentication-related methods:

// to: object user (to who we send an email)
function setAndSendLoginToken(subject, to, res)
{
  // Set login token and send welcome(back) email with auth link
  const token = genToken(params.token.length);
  UserModel.setLoginToken(token, to.id);
  const body =
    "Hello " + to.name + "!" + `
` +
    "Access your account here: " +
    params.siteURL + "/#/authenticate/" + token + `
` +
    "Token will expire in " + params.token.expire/(1000*60) + " minutes."
  sendEmail(params.mail.noreply, to.email, subject, body);
}

router.get('/sendtoken', access.unlogged, access.ajax, (req,res) => {
  const nameOrEmail = decodeURIComponent(req.query.nameOrEmail);
  const type = (nameOrEmail.indexOf('@') >= 0 ? "email" : "name");
  if (UserModel.checkNameEmail({[type]: nameOrEmail}))
  {
    UserModel.getOne(type, nameOrEmail, (err,user) => {
      access.checkRequest(res, err, user, "Unknown user", () => {
        setAndSendLoginToken("Token for " + params.siteURL, user, res);
        res.json({});
      });
    });
  }
});

router.get('/authenticate', access.unlogged, access.ajax, (req,res) => {
  if (!req.query.token.match(/^[a-z0-9]+$/))
    return res.json({errmsg: "Bad token"});
  UserModel.getOne("loginToken", req.query.token, (err,user) => {
    access.checkRequest(res, err, user, "Invalid token", () => {
      // If token older than params.tokenExpire, do nothing
      if (Date.now() > user.loginTime + params.token.expire)
        res.json({errmsg: "Token expired"});
      else
      {
        // Generate session token (if not exists) + destroy login token
        UserModel.trySetSessionToken(user.id, (token) => {
          res.cookie("token", token, {
            httpOnly: true,
            secure: !!params.siteURL.match(/^https/),
            maxAge: params.cookieExpire,
          });
          res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            notify: user.notify,
          });
        });
      }
    });
  });
});

router.get('/logout', access.logged, access.ajax, (req,res) => {
  res.clearCookie("token");
  res.json({});
});

module.exports = router;
