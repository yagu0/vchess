// Get variants list (always needed)

let router = require("express").Router();
const createError = require('http-errors');
const VariantModel = require("../models/Variant");
const access = require("../utils/access");

router.get('/variants', access.ajax, function(req, res, next) {
  VariantModel.getAll((err,variants) => {
    if (!!err)
      return next(err);
    res.json({variantArray:variants});
  });
});

module.exports = router;
