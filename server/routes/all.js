let router = require("express").Router();
const access = require("../utils/access");

router.use("/", require("./challenges"));
router.use("/", require("./games"));
router.use("/", require("./messages"));
router.use("/", require("./users"));
router.use("/", require("./variants"));
router.use("/", require("./problems"));

module.exports = router;
