const express = require('express');
const router = express.Router();
const { 
  getEnquiries, 
  createEnquiry, 
  updateEnquiry, 
  deleteEnquiry 
} = require('../controllers/enquiryController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.route('/')
  .get(collegeProtect, getEnquiries)
  .post(collegeProtect, createEnquiry);

router.route('/:id')
  .put(collegeProtect, updateEnquiry)
  .delete(collegeProtect, deleteEnquiry);

module.exports = router;
