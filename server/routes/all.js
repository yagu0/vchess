var router = require("express").Router();

router.use("/", require("./challenges"));
//router.use("/", require("./games"));
router.use("/", require("./messages"));
router.use("/", require("./problems"));
router.use("/", require("./users"));
router.use("/", require("./variants"));

module.exports = router;
