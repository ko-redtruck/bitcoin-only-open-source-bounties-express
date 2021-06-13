const express = require('express');
var session = require("express-session");
var bodyParser = require("body-parser");

var pgSession = require('connect-pg-simple')(session);
const postgres = require("./db");

const passport = require('passport');

const app = express()
const port = process.env.PORT || 3000;

app.set('views', './views');
app.set('view engine', 'ejs');

app.use(express.static('public'));

/*
app.use(session({
  store: new pgSession({
    pgPromise : postgres          // Connection client
  }),
  secret: "taproot",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure : false // only for dev
   }
}));
*/
app.use(session({ secret: "cats" }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
 console.log("serializing user:",user.id,user);
 done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
 try{
   const res = await postgres.query(`SELECT * FROM Users,Identities WHERE Users.id = $1 AND Users.identity_url=Identities.url`,[id]);
   console.log("deserializeUser:",res.rows[0].id);
   done(null,res.rows[0]);
 }
 catch (err){
   console.log("ERROR deserializeUser",err);
   done(err,null);
 }

});

require("./auth/passport.js")(app);

app.get('/', (req, res) => {
  console.log("user: ",req.user);
  res.render("index",{username : req.user ? req.user.name: "no user"});
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
  }
  catch(err){
    await client.query("ROLLBACK");
    console.log(err);
    res.sendStatus(400);
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
