var express = require('express');
var router = express.Router();

const Variants = require("../variants");

// Home
router.get('/', function(req, res, next) {
  res.render('index', {
		title: 'club',
		variantArray: Variants, //JSON.stringify(Variants)
	});
});

// Variant
router.get("/:vname([a-zA-Z0-9]+)", (req,res) => {
	const vname = req.params["vname"];
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
