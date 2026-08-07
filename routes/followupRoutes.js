const express = require('express');
const router = express.Router();
const { 
  getFollowUps, 
  createFollowUp, 
  updateFollowUp 
} = require('../controllers/followupController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.route('/')
  .get(collegeProtect, getFollowUps)
  .post(collegeProtect, createFollowUp);

router.route('/:id')
  .put(collegeProtect, updateFollowUp);

module.exports = router;
