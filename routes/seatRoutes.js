const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seatController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.route('/')
  .get(collegeProtect, seatController.getSeatData)
  .post(collegeProtect, seatController.upsertSeatConfig);

router.route('/sessions')
  .get(collegeProtect, seatController.getSessions);

router.route('/:id')
  .put(collegeProtect, seatController.upsertSeatConfig)
  .delete(collegeProtect, seatController.deleteSeatConfig);

module.exports = router;