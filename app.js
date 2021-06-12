const express = require('express');
const postgres = require("./db");

var session = require("express-session"),
  bodyParser = require("body-parser");
const passport = require('passport');

const app = express()
const port = 3000

require("./auth/passport.js")(app);

app.get('/', (req, res) => {
  console.log("user: ",req.user);
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

//GITHUB ---------------------------------------
app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

app.post("/post/issue",requireAuth,async (req,res) => {
  try{
    await client.query(`INSERT INTO Issues VALUES($1,$2,$3,$4,$5)`,[req.user.id,new Date(),req.body.title,req.body.link,req.body.description]);
    res.sendStatus(200);
  }
  catch(err){
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/post/bounty",requireAuth, async (req,res) => {
  try{
    await client.query("BEGIN");
    const res1 = await client.query(`INSERT INTO Issues VALUES($1,$2,$3,$4,$5)`,[req.user.id,new Date(),req.body.title,req.body.link,req.body.description]);
    await client.query(`INSERT INTO Bounties VALUES($1,$2,$,3,$4,$5,$6,$7,$8)`,
    [res1.rows[0],req.user.id,req.body.identity_url,req.body.amount,new Date(),false,req.body.announchment_link,req.body.condition_text]);
    await client.query("COMMIT");
    res.sendStatus(200);
  )
  catch(err){
    await client.query("ROLLBACK");
    console.log(err);
    res.sendStatus(400);
  }

  }
});

app.post("/post/bounty/add", requireAuth, async (req,res) =>{
  await client.query(`INSERT INTO Bounties VALUES($1,$2,$,3,$4,$5,$6,$7,$8)`,
  [req.body.issue_id,req.user.id,req.body.identity_url,req.body.amount,new Date(),false,req.body.announchment_link,req.body.condition_text]);

});
function requireAuth(req,next,res) {
  if(req.user){
    return next();
  }
  return res.redirect("/login");
}
