const MealMenu = require('../models/MealMenu');
const MessStudent = require('../models/MessStudent');
const StockInventory = require('../models/StockInventory');
const MessPurchaseRequest = require('../models/MessPurchaseRequest');

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const collegeId = req.college._id;
    const [activeMembers, lowStockItems, todaysMenu] = await Promise.all([
      MessStudent.countDocuments({ collegeId, status: 'Active' }),
      StockInventory.countDocuments({ collegeId, $expr: { $lte: ['$quantity', '$threshold'] } }),
      MealMenu.findOne({ collegeId, day: { $regex: new Date().toLocaleDateString('en-US', { weekday: 'long' }), $options: 'i' } })
    ]);

    res.json({
      activeMembers,
      lowStockItems,
      todaysMenu
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Meal Menu CRUD
exports.getMenu = async (req, res) => {
  try {
    const menu = await MealMenu.find({ collegeId: req.college._id });
    res.json(menu);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.addMenu = async (req, res) => {
  try {
    const menu = new MealMenu({ ...req.body, collegeId: req.college._id });
    await menu.save();
    res.status(201).json(menu);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateMenu = async (req, res) => {
  try {
    const menu = await MealMenu.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      req.body,
      { returnDocument: 'after' }
    );
    res.json(menu);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.deleteMenu = async (req, res) => {
  try {
    await MealMenu.findOneAndDelete({ _id: req.params.id, collegeId: req.college._id });
    res.json({ message: 'Menu deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Mess Students CRUD
exports.getMembers = async (req, res) => {
  try {
    const members = await MessStudent.find({ collegeId: req.college._id }).populate('studentId', 'name rollNo');
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.toggleMemberStatus = async (req, res) => {
  try {
    const member = await MessStudent.findOne({ _id: req.params.id, collegeId: req.college._id });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    
    member.status = member.status === 'Active' ? 'Suspended' : 'Active';
    await member.save();
    res.json(member);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Stock Inventory CRUD
exports.getInventory = async (req, res) => {
  try {
    const inventory = await StockInventory.find({ collegeId: req.college._id });
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.addInventoryItem = async (req, res) => {
  try {
    const item = new StockInventory({ ...req.body, collegeId: req.college._id });
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateInventoryItem = async (req, res) => {
  try {
    const item = await StockInventory.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      req.body,
      { returnDocument: 'after' }
    );
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.deleteInventoryItem = async (req, res) => {
  try {
    await StockInventory.findOneAndDelete({ _id: req.params.id, collegeId: req.college._id });
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Purchase Requests CRUD
exports.getPurchaseRequests = async (req, res) => {
  try {
    const requests = await MessPurchaseRequest.find({ collegeId: req.college._id }).sort('-createdAt');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.addPurchaseRequest = async (req, res) => {
  try {
    const request = new MessPurchaseRequest({ ...req.body, collegeId: req.college._id });
    await request.save();
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updatePurchaseRequestStatus = async (req, res) => {
  try {
    const request = await MessPurchaseRequest.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      { status: req.body.status },
      { returnDocument: 'after' }
    );
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
