let router = require("express").Router();
const createError = require('http-errors');
const VariantModel = require("../models/Variant");
const selectLanguage = require("../utils/language.js");
const access = require("../utils/access");

router.get("/:variant([a-zA-Z0-9]+)", (req,res,next) => {
	const vname = req.params["variant"];
	VariantModel.getByName(vname, (err,variant) => {
		if (!!err)
			return next(err);
		if (!variant)
			return next(createError(404));
		res.render('variant', {
			title: vname + ' Variant',
			variant: variant, //the variant ID might also be useful
			lang: selectLanguage(req, res),
		});
	});
});

// Load a rules page (AJAX)
router.get("/rules/:vname([a-zA-Z0-9]+)", access.ajax, (req,res) => {
	const lang = selectLanguage(req, res);
	res.render("rules/" + req.params["vname"] + "/" + lang);
});

module.exports = router;
