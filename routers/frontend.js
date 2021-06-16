var express = require("express");
var router = express.Router();
const postgres = require("../db");


router.get("/post/issue", (req,res)=>{
  res.render("post/issue");
});

router.get("/post/bounty/add", (req,res)=>{
  res.render("post/add-bounty");
})

router.get("/post/bounty", (req,res)=>{
  res.render("post/bounty");
});

router.get("/bounties", async (req,res)=>{
  await postgres.query(`
    SELECT Issues.*, Bounty.total_bounty_amount, Users.id, Identities.url, Identities.name
    FROM Issues, Users, Identities, (SELECT Issues.id, SUM(Bounties.amount) as total_bounty_amount
      FROM Bounties,Issues
      WHERE Bounties.issue_id = Issues.id
      GROUP BY Issues.id) AS Bounty
    WHERE Issues.id = Bounty.id
    AND Users.identity_url = Identities.url
    AND Issues.user_id = Users.id
    ORDER BY total_bounty_amount DESC
    `)
});

router.get("/issues", async(req,res) =>{
  await postgres.query(`
    SELECT Issues.*,Identities.url,Identities.name
    FROM Issues,Users,Identities
    WHERE Users.identity_url = Identities.url
    AND Issues.user_id = Users.id
    AND Issues.id NOT IN (SELECT issue_id FROM Bounties)
    `)
});


module.exports = router;
