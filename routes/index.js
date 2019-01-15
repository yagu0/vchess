// Main index page

let router = require("express").Router();
const VariantModel = require("../models/Variant");
const selectLanguage = require("../utils/language.js");

router.get('/', function(req, res, next) {
	VariantModel.getAll((err,variants) => {
		if (!!err)
			return next(err);
		res.render('index', {
			title: 'club',
			variantArray: variants,
			lang: selectLanguage(req, res),
		});
	});
});

module.exports = router;
