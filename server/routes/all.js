let router = require("express").Router();
const access = require("../utils/access");

// To avoid a weird preflight AJAX request error in dev mode...
router.get("/", access.ajax, (req,res) => {
  res.json({});
});

router.use("/", require("./challenges"));
router.use("/", require("./games"));
router.use("/", require("./messages"));
router.use("/", require("./users"));
router.use("/", require("./variants"));

module.exports = router;
