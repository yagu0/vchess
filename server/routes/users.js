let router = require("express").Router();
const UserModel = require('../models/User');
const sendEmail = require('../utils/mailer');
const genToken = require("../utils/tokenGenerator");
const access = require("../utils/access");
const params = require("../config/parameters");
const sanitizeHtml_pkg = require('sanitize-html');
const { exec } = require("child_process");

const allowedTags = [
  'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol', 'li', 'b',
  'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div', 'table',
  'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre'
];
function sanitizeHtml(text) {
  return sanitizeHtml_pkg(text, { allowedTags: allowedTags });
}

router.get("/userbio", access.ajax, (req,res) => {
  const uid = req.query["id"];
  if (!!(uid.toString().match(/^[0-9]+$/))) {
    UserModel.getBio(uid, (err, bio) => {
      res.json(bio);
    });
  }
});

router.put('/userbio', access.logged, access.ajax, (req,res) => {
  const bio = sanitizeHtml(req.body.bio);
  UserModel.setBio(req.userId, bio);
  res.json({});
});

router.post('/register', access.unlogged, access.ajax, (req,res) => {
  const name = req.body.name;
  const email = req.body.email;
  const notify = !!req.body.notify;
  if (UserModel.checkNameEmail({ name: name, email: email })) {
    UserModel.create(name, email, notify, (err, ret) => {
      if (!!err) {
        const msg = err.code == "SQLITE_CONSTRAINT"
          ? "User name or email already in use"
          : "User creation failed. Try again";
        res.json({ errmsg: msg });
      }
      else {
        const user = {
          id: ret.id,
          name: name,
          email: email
        };
        setAndSendLoginToken("Welcome to " + params.siteURL, user);
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
      notify: user.notify
    });
  };
  const anonymous = {
    name: "",
    email: "",
    id: 0,
    notify: false
  };
  if (!req.cookies.token) callback(anonymous);
  else if (req.cookies.token.match(/^[a-z0-9]+$/)) {
    UserModel.getOne(
      "sessionToken", req.cookies.token, "name, email, id, notify",
      (err, user) => callback(user || anonymous)
    );
  }
});

// NOTE: this method is safe because only IDs and names are returned
router.get("/users", access.ajax, (req,res) => {
  const ids = req.query["ids"];
  // NOTE: slightly too permissive RegExp
  if (!!ids && !!ids.match(/^([0-9]+,?)+$/)) {
    UserModel.getByIds(ids, (err, users) => {
      res.json({ users: users });
    });
  }
});

router.put('/update', access.logged, access.ajax, (req,res) => {
  const name = req.body.name;
  const email = req.body.email;
  if (UserModel.checkNameEmail({ name: name, email: email })) {
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
function setAndSendLoginToken(subject, to) {
  // Set login token and send welcome(back) email with auth link
  const token = genToken(params.token.length);
  UserModel.setLoginToken(token, to.id);
  const body =
    "Hello " + to.name + " !" + `
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
  if (UserModel.checkNameEmail({ [type]: nameOrEmail })) {
    UserModel.getOne(type, nameOrEmail, "id, name, email", (err, user) => {
      access.checkRequest(res, err, user, "Unknown user", () => {
        setAndSendLoginToken("Token for " + params.siteURL, user);
        res.json({});
      });
    });
  }
});

router.get('/authenticate', access.unlogged, access.ajax, (req,res) => {
  if (!req.query.token.match(/^[a-z0-9]+$/))
    return res.json({ errmsg: "Bad token" });
  UserModel.getOne(
    "loginToken", req.query.token, "id, name, email, notify",
    (err,user) => {
      access.checkRequest(res, err, user, "Invalid token", () => {
        // If token older than params.tokenExpire, do nothing
        if (Date.now() > user.loginTime + params.token.expire)
          res.json({ errmsg: "Token expired" });
        else {
          // Generate session token (if not exists) + destroy login token
          UserModel.trySetSessionToken(user.id, (token) => {
            res.cookie("token", token, {
              httpOnly: true,
              secure: !!params.siteURL.match(/^https/),
              maxAge: params.cookieExpire,
            });
            res.json(user);
          });
        }
      });
    }
  );
});

router.get('/logout', access.logged, access.ajax, (req,res) => {
  res.clearCookie("token");
  res.json({});
});

module.exports = router;
