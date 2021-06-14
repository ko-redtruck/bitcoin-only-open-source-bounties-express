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
    SELECT Issues.* Bounty.total_bounty_amount, Users.id, Identities.url, Identities.name
    FROM Issues, Users, Identities, (SELECT Issues.id, SUM(Bounties.amount) as total_bounty_amount
      FROM Bounties,Issues
      WHERE Bounties.issue_id = Issues.id
      GROUP BY Issues.id
      ORDER BY total_bounty_amount DESC) AS Bounty
    WHERE Issues.id = Bounty.id
    AND Users.identity_url = Identities.url
    AND Issue.user_id = Users.id
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

router.get("/issues/:issue_id", async(req,res)=>{
  const res1 = await postgres.query(`
    SELECT Issues.*,Identities.url,Identities.name
    FROM Issues,Users,Identities
    WHERE Users.identity_url = Identities.url
    AND Issues.user_id = Users.id
    AND Issues.id = $1
    `,[req.params.issue_id]);
  if(res1.rows.length==0){
    return res.send("no issue found");
  }
  const issueData = res1.rows[0];
  const res2 = await postgres.query(`
    SELECT Bounties.*,I_A.name as identity_name, I_B.name, I_B.url
    FROM Bounties,Users,Identities I_A, Identities I_B
    WHERE Bounties.issue_id = $1
    AND Bounties.identity_url = I_A.url
    AND Bounties.user_id = Users.id
    AND Users.identity_url = I_B.url
    `,[issueData.id]);
    const bounties = res2.rows;

});
module.exports = router;
