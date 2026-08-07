const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { collegeProtect } = require('../middlewares/authMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads/notices');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

router.get('/stats', collegeProtect, noticeController.getNoticeStats);
router.get('/', collegeProtect, noticeController.getNotices);
router.post('/', collegeProtect, upload.array('attachments', 5), noticeController.createNotice);
router.get('/:id', collegeProtect, noticeController.getNoticeById);
router.put('/:id', collegeProtect, upload.array('attachments', 5), noticeController.updateNotice);
router.delete('/:id', collegeProtect, noticeController.deleteNotice);

module.exports = router;