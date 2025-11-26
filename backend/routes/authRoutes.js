const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/register', async (req,res) => {
  try {
    const { name, email, password } = req.body;
    if(!name || !email || !password) return res.status(400).json({msg:'Missing fields'});
    const existing = await User.findOne({email});
    if(existing) return res.status(400).json({msg:'Email already registered'});
    const hashed = await bcrypt.hash(password, 10);
    const isAdmin = (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD);
    const user = new User({ name, email, password: hashed, isAdmin });
    await user.save();
    res.json({msg:'Registered'});
  } catch(e){ console.error(e); res.status(500).json({msg:'Server error'}); }
});

router.post('/login', async (req,res) => {
  try {
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).json({msg:'Missing fields'});
    const user = await User.findOne({email});
    if(!user) return res.status(400).json({msg:'Invalid credentials'});
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(400).json({msg:'Invalid credentials'});
    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch(e){ console.error(e); res.status(500).json({msg:'Server error'}); }
});

module.exports = router;
