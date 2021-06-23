var express = require("express");
var router = express.Router();
const postgres = require("../db");

const requireAuth = require("./auth").requireAuth;
const { Octokit } = require("@octokit/core");
const octokit = new Octokit({ auth: `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` });


router.get("/issues/:owner/:repo",async (req,res)=>{
  const data = await octokit.request('GET /repos/{owner}/{repo}/issues', {
    owner: req.params.owner,
    repo: req.params.repo,
    page : req.query.page ? parseInt(req.query.page) : 1
  });
    res.render("issues",{user: req.user,issues:data.data, pag : calcPagnation("/issues/"+req.params.owner + "/"+req.params.repo,req.query.page ? parseInt(req.query.page) : 1)})
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
