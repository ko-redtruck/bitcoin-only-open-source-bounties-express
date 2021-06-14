var express = require("express");
var router = express.Router();


router.get("/post/issue", (req,res)=>{
  res.render("post/issue");
});

router.get("/post/bounty/add", (req,res)=>{
  res.render("post/add-bounty");
})

router.get("/post/bounty", (req,res)=>{
  res.render("post/bounty");
})
module.exports = router;
