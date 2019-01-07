var router = require("express").Router();

router.use("/", require("./index"));
router.use("/", require("./variant"));
router.use("/", require("./problems"));
router.use("/", require("./messages"));

module.exports = router;
