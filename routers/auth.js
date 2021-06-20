function requireAuth(req,res,next) {
  if(req.user){
    return next();
  }
  return res.redirect("/auth/login");
}

module.exports.requireAuth = requireAuth;
