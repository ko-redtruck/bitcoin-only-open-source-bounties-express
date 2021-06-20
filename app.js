const express = require('express');
var session = require("express-session");
var bodyParser = require("body-parser");

var pgSession = require('connect-pg-simple')(session);
const postgres = require("./db");

const passport = require('passport');
var frontend = require('./routers/frontend');
const requireAuth = require("./routers/auth").requireAuth;
const app = express()
const port = process.env.PORT || 3000;


app.set('views', './views');
app.set('view engine', 'ejs');

app.use(express.static('public'));


app.use(session({
  store: new pgSession({
    pool : postgres          // Connection postgres
  }),
  secret: "taproot",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure : false // only for dev
   }
}));

//app.use(session({ secret: "cats" }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
 console.log("serializing user:",user.id,user);
 done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
 try{
   const res = await postgres.query(`SELECT Users.*,Identities.url,Identities.name FROM Users,Identities WHERE Users.id = $1 AND Users.identity_id=Identities.id`,[id]);
   console.log("deserializeUser:",res.rows[0].id);
   done(null,res.rows[0]);
 }
 catch (err){
   console.log("ERROR deserializeUser",err);
   done(err,null);
 }
});

require("./auth/passport.js")(app);

app.use("/",frontend);

app.get('/', async(req, res) => {
  console.log("user: ",req.user);
  const res1 = await postgres.query(`
    SELECT Issues.*, Bounty.total_bounty_amount, Users.id as user_id, Identities.url, Identities.name
    FROM Issues, Users, Identities, (SELECT Issues.id, SUM(Bounties.amount) as total_bounty_amount
      FROM Bounties,Issues
      WHERE Bounties.issue_id = Issues.id
      GROUP BY Issues.id) AS Bounty
    WHERE Issues.id = Bounty.id
    AND Users.id = Identities.id
    AND Issues.user_id = Users.id
    ORDER BY total_bounty_amount DESC
    `);


  res.render("index",{issues: res1.rows, user: req.user,username : req.user ? req.user.name: "no user"});
})

app.get("/bounties/:issue_id", async(req,res)=>{
  console.log(req.params);
  const res1 = await postgres.query(`
    SELECT Issues.*,Identities.url,Identities.name
    FROM Issues,Users,Identities
    WHERE Users.identity_id = Identities.id
    AND Issues.user_id = Users.id
    AND Issues.id = $1
    `,[parseInt(req.params.issue_id)]);

  if(res1.rows.length==0){
    return res.send("no issue/bounty found");
  }

  const issueData = res1.rows[0];
  const res2 = await postgres.query(`
    SELECT Bounties.*,I_A.name as identity_name, I_A.url as identity_url, I_B.name, I_B.url
    FROM Bounties,Users,Identities I_A, Identities I_B
    WHERE Bounties.issue_id = $1
    AND Bounties.identity_id = I_A.id
    AND Bounties.user_id = Users.id
    AND Users.identity_id = I_B.id
    ORDER BY Bounties.amount DESC
    `,[issueData.id]);
  const bounties = res2.rows;
  res.render("bounty",{bounty: issueData,bounties: bounties, user: req.user});
});


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

app.get('/auth/logout', function(req, res){
  req.logout();
  res.redirect('/');
  });
app.post("/post/issue",requireAuth,async (req,res) => {
  try{
    prepareFormInputs(req);
    await postgres.query(`INSERT INTO Issues(user_id,created_on,title,link,description) VALUES($1,$2,$3,$4,$5)`,[req.user.id,new Date(),req.body.title,req.body.link,req.body.description]);
    res.sendStatus(200);
  }
  catch(err){
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/post/bounty", async (req,res) => {
  console.log("user",req.user);
  try{
    prepareFormInputs(req);
    await postgres.query("BEGIN");

    //bounty is from someone else
    let identity_id;
    if(req.body.bounty_payer_url != null && req.body.bounty_payer_name != null){
      req.body.bounty_payer_url = req.body.bounty_payer_url.replace("https://","").replace("http://","");
      const res0 = await postgres.query("SELECT * FROM Identities WHERE url=$1",[req.body.bounty_payer_url]);
      if(res0.rows.length == 0){
        const res01 = await postgres.query("INSERT INTO Identities(url,name) VALUES($1,$2) RETURNING *",[req.body.bounty_payer_url,req.body.bounty_payer_name]);
        identity_id = res01.rows[0].id;
      }
      else{
        identity_id = res0.rows[0].id;
      }
    }
    else{
      identity_id = req.user.identity_id;
    }
    const res1 = await postgres.query(`INSERT INTO Issues(user_id,created_on,title,link,condition_text,description) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[req.user.id,new Date(),req.body.title,req.body.link,req.body.condition_text,req.body.description]);
    await postgres.query(`INSERT INTO Bounties(issue_id,user_id,identity_id,amount,created_on,funding_secured,announchment_link,payed_out_to) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [res1.rows[0].id,req.user.id,identity_id,parseInt(req.body.amount),new Date(),false,req.body.announchment_link,null]);
    await postgres.query("COMMIT");
    res.redirect("/bounties/"+res1.rows[0].id);
  }
  catch(err){
    await postgres.query("ROLLBACK");
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/post/bounty/add", requireAuth, async (req,res) =>{
  prepareFormInputs(req);
  console.log("user:",req.user);
  try{
    await postgres.query("BEGIN");

    let identity_id;
    if(req.body.bounty_payer_url != null && req.body.bounty_payer_name != null){
      console.log("is not from current user")
      req.body.bounty_payer_url = req.body.bounty_payer_url.replace("https://","").replace("http://","");
      const res0 = await postgres.query("SELECT * FROM Identities WHERE url=$1",[req.body.bounty_payer_url]);
      if(res0.rows.length == 0){
        console.log("creating new user");
        const res01 = await postgres.query("INSERT INTO Identities(url,name) VALUES($1,$2) RETURNING *",[req.body.bounty_payer_url,req.body.bounty_payer_name]);
        identity_id = res01.rows[0].id;
      }
      else{
        identity_id = res0.rows[0].id;
      }
    }
    else{
      identity_id = req.user.identity_id;
    }

    await postgres.query(`INSERT INTO Bounties VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [req.body.issue_id,req.user.id,identity_id,parseInt(req.body.amount),new Date(),false,req.body.announchment_link,null]);
    await postgres.query("COMMIT");
    res.redirect("/bounties/"+req.body.issue_id);
  }
  catch(err){
    await postgres.query("ROLLBACK");
    console.log(err);
    res.sendStatus(400);
  }
});


//if req.body[key] == '' --> req.body[key] = null;
function prepareFormInputs(req) {
  Object.keys(req.body).forEach((key, i) => {
    if(req.body[key] === ''){
      req.body[key] = null;
    }
    else{
      req.body[key] = removeUrlProtocols(req.body[key])
    }
  });
}

function removeUrlProtocols(url) {
  return url.replace(/(^\w+:|^)\/\//, '');
}
