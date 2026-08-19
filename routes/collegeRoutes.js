const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { createCollege, getAllColleges, toggleCollegeStatus, deleteCollege, getCollegeById, updateCollege, getCollegeCategoryDetails, getCollegeCategoryFilters } = require('../controllers/collegeController');
const { protect } = require('../middlewares/authMiddleware');

// Set up Multer for College Logo upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `college-logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 2 // 2MB limit as per UI
  },
  fileFilter: fileFilter
});

// @route   POST /api/colleges
router.post('/', protect, upload.single('collegeLogo'), createCollege);

// @route   GET /api/colleges
router.get('/', protect, getAllColleges);

// @route   GET /api/colleges/:id
router.get('/:id', protect, getCollegeById);

// @route   PUT /api/colleges/:id
router.put('/:id', protect, upload.single('collegeLogo'), updateCollege);

// @route   PATCH /api/colleges/:id/status
router.patch('/:id/status', protect, toggleCollegeStatus);

// @route   DELETE /api/colleges/:id
router.delete('/:id', protect, deleteCollege);

// @route   GET /api/colleges/:id/details/:category/filters
router.get('/:id/details/:category/filters', protect, getCollegeCategoryFilters);

// @route   GET /api/colleges/:id/details/:category
router.get('/:id/details/:category', protect, getCollegeCategoryDetails);

module.exports = router;
