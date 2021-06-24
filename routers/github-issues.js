var express = require("express");
var router = express.Router();
const postgres = require("../db");

const requireAuth = require("./auth").requireAuth;
const { Octokit } = require("@octokit/core");
const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN });


router.get("/issues/:owner/:repo",async (req,res)=>{
  try{
    const data = await octokit.request('GET /repos/{owner}/{repo}/issues', {
      owner: req.params.owner,
      repo: req.params.repo,
      page : req.query.page ? parseInt(req.query.page) : 1
    });
      res.render("issues",{user: req.user,issues:data.data, owner: req.params.owner, repo : req.params.repo, pag : calcPagnation("/issues/"+req.params.owner + "/"+req.params.repo,req.query.page ? parseInt(req.query.page) : 1)})
  }
  catch(err){
    res.send("Not found");
  }

});

router.get("/issues/add-bounty",async(req,res)=>{
  try{
    const data = await octokit.request('GET /repos/{owner}/{repo}/issues/{id}', {
      owner: req.query.owner,
      repo: req.query.repo,
      id : req.query.id
    });

    let form_url = "/post/bounty";
    let db_issue_id = "";
    const res1 = await postgres.query("SELECT * FROM Issues WHERE title = $1",[data.data.title]);
    if(res1.rows.length != 0){
      form_url = "/post/bounty/add";
      db_issue_id = res1.rows[0].id;
    }
    res.render("post/add-bounty-issue",{issue: data.data, owner: req.query.owner, repo : req.query.repo,form_url: form_url,db_issue_id: db_issue_id, user: req.user});
  }
  catch(err){
    console.log(err);
    res.send("Issue not found")
  }
});

router.get("/issues-data/:owner/:repo",async (req,res)=>{
  const data = await octokit.request('GET /repos/{owner}/{repo}/issues', {
    owner: req.params.owner,
    repo: req.params.repo,
    page : req.query.page ? parseInt(req.query.page) : 1
  });
    res.json(data);
});


function calcPagnation(path,page) {
  return {
    path : path,
    current : page,
    previous : page > 1 ? page -1 : 1,
    next : page + 1
  }
}
module.exports = router;
