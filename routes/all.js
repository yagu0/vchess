var express = require('express');
var router = express.Router();
var createError = require('http-errors');

const Variants = require("../variants");

// Home
router.get('/', function(req, res, next) {
  res.render('index', {
		title: 'club',
		variantArray: Variants, //JSON.stringify(Variants)
	});
});

// Variant
router.get("/:vname([a-zA-Z0-9]+)", (req,res,next) => {
	const vname = req.params["vname"];
	if (!Variants.some(v => { return (v.name == vname); }))
		return next(createError(404));
	res.render('variant', {
		title: vname + ' Variant',
		variant: vname,
	});
});

// Load a rules page (AJAX)
router.get("/rules/:variant([a-zA-Z0-9]+)", (req,res) => {
  res.render("rules/" + req.params["variant"]);
});

module.exports = router;
