const express = require('express');
const router = express.Router();
const studyMaterialController = require('../controllers/studyMaterialController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.use(collegeProtect);

router.route('/')
  .get(studyMaterialController.getMaterials)
  .post(studyMaterialController.createMaterial);

router.route('/:id')
  .delete(studyMaterialController.deleteMaterial);

module.exports = router;
