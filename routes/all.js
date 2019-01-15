var router = require("express").Router();

router.use("/", require("./index"));
router.use("/", require("./users"));
router.use("/", require("./messages"));
//router.use("/", require("./playing"));
//router.use("/", require("./challenge"));
router.use("/", require("./problems"));
router.use("/", require("./variant"));

module.exports = router;
