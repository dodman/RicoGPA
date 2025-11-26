const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Admin-only: list users
router.get('/users', authMiddleware, async (req,res) => {
  try {
    if(!req.user.isAdmin) return res.status(403).json({msg:'Forbidden'});
    const users = await User.find({}, 'name email isAdmin courses createdAt');
    res.json({ users });
  } catch(e){ console.error(e); res.status(500).json({msg:'Server error'}); }
});

// Admin-only: delete user
router.delete('/user/:id', authMiddleware, async (req,res) => {
  try {
    if(!req.user.isAdmin) return res.status(403).json({msg:'Forbidden'});
    await User.findByIdAndDelete(req.params.id);
    res.json({msg:'Deleted'});
  } catch(e){ console.error(e); res.status(500).json({msg:'Server error'}); }
});

module.exports = router;
