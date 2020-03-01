// Get variants list (always needed)

let router = require("express").Router();
const VariantModel = require("../models/Variant");
const access = require("../utils/access");

router.get('/variants', function(req, res) {
  VariantModel.getAll((err,variants) => {
    res.json(err || {variantArray:variants});
  });
});

module.exports = router;
