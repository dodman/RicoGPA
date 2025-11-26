const jwt = require('jsonwebtoken');
module.exports = function(req,res,next){
  const auth = req.headers['authorization'];
  if(!auth) return res.status(401).json({msg:'No token'});
  const token = auth.split(' ')[1];
  if(!token) return res.status(401).json({msg:'No token'});
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = { id: decoded.id, isAdmin: decoded.isAdmin };
    next();
  } catch(e){ return res.status(401).json({msg:'Invalid token'}); }
}
