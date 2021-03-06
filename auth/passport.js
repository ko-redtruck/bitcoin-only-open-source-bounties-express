const passport = require('passport');
const postgres = require('../db');

module.exports = function (app) {
 async function authenticationFunction(provider_id,provider_name,url,name,done) {
   try{
     const res = await postgres.query(`SELECT Users.id, Users.provider_id, Users.provider_name, Users.created_on, Users.privilege_level, Identities.url, Identities.name as name FROM Users,Identities WHERE provider_id = $1 AND provider_name = $2 AND Users.identity_id = Identities.id`,[provider_id,provider_name]);
     //user does not exist
     if(res.rows.length == 0){
       try{
         await postgres.query("BEGIN");
         
         let identity_id;
         let res1;
         res1 = await postgres.query("SELECT * FROM Identities WHERE url=$1",[url]);
         if(res1.rows.length == 0){
           res1 = await postgres.query("INSERT INTO Identities(url,name) VALUES($1,$2) ON CONFLICT (url) DO NOTHING RETURNING *",[url,name]);
           identity_id = res1.rows[0].id;
         }
         else{
           identity_id = res1.rows[0].id;
         }
         const res2 = await postgres.query(" INSERT INTO Users(provider_id,provider_name,created_on,identity_id) VALUES($1,$2,$3,$4) RETURNING *",[provider_id,provider_name,new Date(),identity_id])
         await postgres.query("COMMIT");

         console.log("Signing up new user: ",url);
         return done(null,{
           id : res2.rows[0].id,
           provider_id : res2.rows[0].provider_id,
           provider_name : res2.rows[0].provider_name,
           created_on : res2.rows[0].created_on,
           url : res1.rows[0].url,
           name : res1.rows[0].name,
           privilege_level : res2.rows[0].privilege_level
         });

       }
       catch(err){
         await postgres.query("ROLLBACK");
         return done(null,err);
       }
     }
     else{
       console.log("logging in for user")
        return done(null,res.rows[0]);
     }

   }
   catch(err){
     return done(err,null);
   }

 }

 require("./strategies/github")(authenticationFunction);
}
