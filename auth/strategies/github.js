const passport = require('passport');
var GitHubStrategy = require('passport-github2').Strategy;

module.exports = function(authenticationFunction){
  passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL
    },
    async function(req, accessToken, refreshToken, profile, done) {
      authenticationFunction(profile.id,"GitHub","github.com/"+profile.username, profile.displayName + " (" +profile.username+")",done);
    }
  ));
}
