// AJAX methods to get, create, update or delete a problem

let router = require("express").Router();
const access = require("../utils/access");
const NewsModel = require("../models/News");
const sanitizeHtml = require('sanitize-html');
const devs = [1]; //hard-coded list of developers, allowed to post news

router.get("/news", (req,res) => {
  const cursor = req.query["cursor"];
  if (!cursor.match(/^[0-9]+$/))
    return res.json({errmsg: "Bad cursor value"});
  NewsModel.getNext(cursor, (err,newsList) => {
    res.json(err || {newsList:newsList});
  });
});

router.post("/news", access.logged, access.ajax, (req,res) => {
  if (!devs.includes(req.userId))
    return res.json({errmsg: "Not allowed to post"});
  const content = sanitizeHtml(req.body.news.content);
  NewsModel.create(content, req.userId, (err,ret) => {
    return res.json(err || {nid:ret.nid});
  });
});

router.put("/news", access.logged, access.ajax, (req,res) => {
  if (!devs.includes(req.userId))
    return res.json({errmsg: "Not allowed to edit"});
  let news = req.body.news;
  if (!news.id.toString().match(/^[0-9]+$/))
    res.json({errmsg: "Bad news ID"});
  news.content = sanitizeHtml(news.content);
  NewsModel.update(news, (err) => {
    res.json(err || {});
  });
});

router.delete("/news", access.logged, access.ajax, (req,res) => {
  if (!devs.includes(req.userId))
    return res.json({errmsg: "Not allowed to delete"});
  const nid = req.query.id;
  if (!nid.toString().match(/^[0-9]+$/))
    res.json({errmsg: "Bad news ID"});
  NewsModel.remove(nid, err => {
    res.json(err || {});
  });
});

module.exports = router;
