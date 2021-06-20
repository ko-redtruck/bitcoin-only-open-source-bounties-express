var express = require("express");
var router = express.Router();
const postgres = require("../db");

const requireAuth = require("./auth").requireAuth;


router.get("/post/bounty/add",requireAuth, (req,res)=>{
  res.render("post/add-bounty",{user:req.user,bounty:{id:req.query.id}});
})

router.get("/post/bounty",requireAuth, (req,res)=>{
  res.render("post/bounty",{user:req.user});
});

router.get("/auth/login", (req,res)=>{
  res.render("auth/login",{user:req.user});
});


module.exports = router;
