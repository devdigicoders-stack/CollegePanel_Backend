const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.use(collegeProtect);

router.get('/stats', libraryController.getStats);
router.get('/books', libraryController.getBooks);
router.get('/books/:id', libraryController.getBookById);
router.post('/books/import', libraryController.importBooks);
router.post('/books', libraryController.addBook);
router.put('/books/:id', libraryController.updateBook);
router.delete('/books/:id', libraryController.deleteBook);
router.get('/categories', libraryController.getCategories);

router.get('/members', libraryController.getMembers);
router.put('/members/:id/toggle-status', libraryController.toggleMemberStatus);

router.get('/transactions', libraryController.getTransactions);
router.get('/transactions/:id', libraryController.getTransactionById);
router.post('/issue', libraryController.issueBook);
router.post('/return', libraryController.returnBook);
router.post('/transactions/:id/renew', libraryController.renewTransaction);

router.get('/reservations', libraryController.getReservations);
router.post('/reservations', libraryController.addReservation);
router.put('/reservations/:id', libraryController.updateReservationStatus);
router.delete('/reservations/:id', libraryController.deleteReservation);

router.get('/fines', libraryController.getFines);
router.post('/fines/collect', libraryController.collectFine);

router.get('/lost-damaged', libraryController.getLostDamaged);
router.post('/lost-damaged', libraryController.addLostDamaged);
router.put('/lost-damaged/:id', libraryController.updateLostDamagedStatus);
router.delete('/lost-damaged/:id', libraryController.deleteLostDamaged);

router.post('/stock/verify', libraryController.verifyStock);
router.get('/stock', libraryController.getStockItems);

router.get('/reports', libraryController.getReportData);
router.get('/reports/custom', libraryController.getCustomReportData);
router.get('/reports/daily-transactions', libraryController.getDailyTransactions);

module.exports = router;
