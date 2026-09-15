const College = require('../models/College');

// Helper to determine module key from name if not provided
const resolveModuleKey = (moduleName, key) => {
  if (key && ['hostel', 'mess', 'library', 'complaints', 'security', 'all'].includes(key)) {
    return key;
  }
  const lower = (moduleName || '').toLowerCase();
  if (lower.includes('hostel')) return 'hostel';
  if (lower.includes('mess')) return 'mess';
  if (lower.includes('library')) return 'library';
  if (lower.includes('complaint')) return 'complaints';
  if (lower.includes('security') || lower.includes('visitor')) return 'security';
  return 'all';
};

// @desc    Admin: Submit upgrade request for a module
// @route   POST /api/upgrade-requests
// @access  Private (collegeProtect)
exports.createUpgradeRequest = async (req, res) => {
  try {
    const collegeId = req.college ? req.college._id : req.user?.collegeId;
    if (!collegeId) {
      return res.status(400).json({ message: 'College identification not found' });
    }

    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }

    const { contactPerson, phone, moduleName, moduleKey, moduleKeys, notes } = req.body;

    if (!contactPerson || !phone) {
      return res.status(400).json({ message: 'Contact person name and phone number are required' });
    }

    let finalKeys = [];
    if (Array.isArray(moduleKeys) && moduleKeys.length > 0) {
      finalKeys = moduleKeys;
    } else if (moduleKey) {
      finalKeys = [moduleKey];
    } else {
      finalKeys = [resolveModuleKey(moduleName)];
    }

    const isAll = finalKeys.includes('all') || finalKeys.length >= 5;
    const finalKeyStr = isAll ? 'all' : finalKeys.join(', ');
    const finalNameStr = isAll 
      ? '⚡ Full Premium Suite (All Modules)' 
      : (moduleName || finalKeys.map(k => k.toUpperCase()).join(', '));

    const newRequest = {
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      moduleName: finalNameStr,
      moduleKey: finalKeyStr,
      moduleKeys: isAll ? ['all'] : finalKeys,
      status: 'Pending',
      notes: notes || '',
      createdAt: new Date()
    };

    college.upgradeRequests.push(newRequest);
    await college.save();

    const created = college.upgradeRequests[college.upgradeRequests.length - 1];

    res.status(201).json({
      message: 'Upgrade activation request submitted successfully! Superadmin will review and unlock it.',
      request: created
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit upgrade request', error: error.message });
  }
};

// @desc    Superadmin: Get all upgrade requests
// @route   GET /api/superadmin/upgrade-requests
// @access  Private (superadmin protect)
exports.getAllUpgradeRequests = async (req, res) => {
  try {
    const { status, search } = req.query;

    const colleges = await College.find({ 'upgradeRequests.0': { $exists: true } })
      .select('collegeName collegeCode collegeType contactNumber officialEmail adminName adminEmail isPremiumUnlocked unlockedModules upgradeRequests');

    let total = 0, pending = 0, approved = 0, rejected = 0, locked = 0;
    const allRequests = [];

    colleges.forEach((col) => {
      (col.upgradeRequests || []).forEach((reqItem) => {
        total++;
        if (reqItem.status === 'Pending') pending++;
        if (reqItem.status === 'Approved') approved++;
        if (reqItem.status === 'Rejected') rejected++;
        if (reqItem.status === 'Locked' || reqItem.status === 'Inactive') locked++;

        // Filter by status if provided
        if (status && status !== 'All' && reqItem.status !== status) {
          return;
        }

        // Filter by search term
        if (search && search.trim()) {
          const s = search.trim().toLowerCase();
          const match =
            col.collegeName.toLowerCase().includes(s) ||
            (reqItem.contactPerson || '').toLowerCase().includes(s) ||
            (reqItem.phone || '').includes(s) ||
            (reqItem.moduleName || '').toLowerCase().includes(s);
          if (!match) return;
        }

        allRequests.push({
          _id: reqItem._id,
          collegeId: {
            _id: col._id,
            collegeName: col.collegeName,
            collegeCode: col.collegeCode,
            collegeType: col.collegeType,
            adminName: col.adminName,
            adminEmail: col.adminEmail,
            isPremiumUnlocked: col.isPremiumUnlocked,
            unlockedModules: col.unlockedModules || []
          },
          collegeName: col.collegeName,
          contactPerson: reqItem.contactPerson,
          phone: reqItem.phone,
          moduleName: reqItem.moduleName,
          moduleKey: reqItem.moduleKey,
          moduleKeys: reqItem.moduleKeys || (reqItem.moduleKey ? reqItem.moduleKey.split(',').map(s => s.trim()) : ['all']),
          status: reqItem.status,
          notes: reqItem.notes,
          createdAt: reqItem.createdAt,
          approvedAt: reqItem.approvedAt,
          rejectedAt: reqItem.rejectedAt,
          lockedAt: reqItem.lockedAt,
          actionBy: reqItem.actionBy
        });
      });
    });

    allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const stats = { total, pending, approved, rejected, locked };

    res.status(200).json({
      stats,
      requests: allRequests
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch upgrade requests', error: error.message });
  }
};

// @desc    Superadmin: Approve an upgrade request & unlock module for that college
// @route   PATCH /api/superadmin/upgrade-requests/:id/approve
// @access  Private (superadmin protect)
exports.approveUpgradeRequest = async (req, res) => {
  try {
    const college = await College.findOne({ 'upgradeRequests._id': req.params.id });
    if (!college) {
      return res.status(404).json({ message: 'Upgrade request not found' });
    }

    const requestItem = college.upgradeRequests.id(req.params.id);
    if (!requestItem) {
      return res.status(404).json({ message: 'Upgrade request item not found' });
    }

    let keysToUnlock = [];
    if (requestItem.moduleKeys && requestItem.moduleKeys.length > 0) {
      keysToUnlock = requestItem.moduleKeys;
    } else if (requestItem.moduleKey) {
      keysToUnlock = requestItem.moduleKey.split(',').map(s => s.trim());
    } else {
      keysToUnlock = ['all'];
    }

    // Unlock all requested modules for this specific college
    if (keysToUnlock.includes('all')) {
      college.isPremiumUnlocked = true;
      if (!college.unlockedModules.includes('all')) {
        college.unlockedModules.push('all');
      }
    } else {
      keysToUnlock.forEach(k => {
        if (k && !college.unlockedModules.includes(k)) {
          college.unlockedModules.push(k);
        }
      });
    }

    // Mark request as Approved
    requestItem.status = 'Approved';
    requestItem.approvedAt = new Date();
    requestItem.actionBy = req.superAdmin?.name || 'SuperAdmin';

    await college.save();

    res.status(200).json({
      message: `Successfully approved! Module "${requestItem.moduleName}" is now unlocked for ${college.collegeName}.`,
      request: requestItem,
      college: {
        _id: college._id,
        collegeName: college.collegeName,
        isPremiumUnlocked: college.isPremiumUnlocked,
        unlockedModules: college.unlockedModules
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve upgrade request', error: error.message });
  }
};

// @desc    Superadmin: Reject an upgrade request
// @route   PATCH /api/superadmin/upgrade-requests/:id/reject
// @access  Private (superadmin protect)
exports.rejectUpgradeRequest = async (req, res) => {
  try {
    const college = await College.findOne({ 'upgradeRequests._id': req.params.id });
    if (!college) {
      return res.status(404).json({ message: 'Upgrade request not found' });
    }

    const requestItem = college.upgradeRequests.id(req.params.id);
    if (!requestItem) {
      return res.status(404).json({ message: 'Upgrade request item not found' });
    }

    requestItem.status = 'Rejected';
    requestItem.rejectedAt = new Date();
    requestItem.actionBy = req.superAdmin?.name || 'SuperAdmin';
    if (req.body.notes) requestItem.notes = req.body.notes;

    await college.save();

    res.status(200).json({
      message: 'Upgrade request has been rejected.',
      request: requestItem
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject upgrade request', error: error.message });
  }
};

// @desc    Superadmin: Lock / Deactivate an approved upgrade request & revoke modules for that college
// @route   PATCH /api/superadmin/upgrade-requests/:id/lock
// @access  Private (superadmin protect)
exports.lockUpgradeRequest = async (req, res) => {
  try {
    const college = await College.findOne({ 'upgradeRequests._id': req.params.id });
    if (!college) {
      return res.status(404).json({ message: 'Upgrade request not found' });
    }

    const requestItem = college.upgradeRequests.id(req.params.id);
    if (!requestItem) {
      return res.status(404).json({ message: 'Upgrade request item not found' });
    }

    let keysToLock = [];
    if (requestItem.moduleKeys && requestItem.moduleKeys.length > 0) {
      keysToLock = requestItem.moduleKeys;
    } else if (requestItem.moduleKey) {
      keysToLock = requestItem.moduleKey.split(',').map(s => s.trim());
    } else {
      keysToLock = ['all'];
    }

    // Revoke modules for this college
    if (keysToLock.includes('all')) {
      college.isPremiumUnlocked = false;
      college.unlockedModules = [];
    } else {
      college.unlockedModules = (college.unlockedModules || []).filter(m => !keysToLock.includes(m) && m !== 'all');
      if (college.isPremiumUnlocked) college.isPremiumUnlocked = false;
    }

    requestItem.status = 'Locked';
    requestItem.lockedAt = new Date();
    requestItem.actionBy = req.superAdmin?.name || 'SuperAdmin';

    await college.save();

    res.status(200).json({
      message: `Modules locked! ${requestItem.moduleName} has been deactivated for ${college.collegeName}.`,
      request: requestItem,
      college: {
        _id: college._id,
        collegeName: college.collegeName,
        isPremiumUnlocked: college.isPremiumUnlocked,
        unlockedModules: college.unlockedModules
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to lock upgrade request', error: error.message });
  }
};

// @desc    Superadmin: Direct toggle of premium module for a college
// @route   PATCH /api/superadmin/upgrade-requests/college/:collegeId/toggle-module
// @access  Private (superadmin protect)
exports.toggleCollegeModule = async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { moduleKey, enable } = req.body;

    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }

    if (moduleKey === 'all') {
      college.isPremiumUnlocked = !!enable;
      if (enable && !college.unlockedModules.includes('all')) {
        college.unlockedModules.push('all');
      } else if (!enable) {
        college.unlockedModules = college.unlockedModules.filter(m => m !== 'all');
      }
    } else {
      if (enable && !college.unlockedModules.includes(moduleKey)) {
        college.unlockedModules.push(moduleKey);
      } else if (!enable) {
        college.unlockedModules = college.unlockedModules.filter(m => m !== moduleKey);
      }
    }

    await college.save();

    res.status(200).json({
      message: `Module "${moduleKey}" ${enable ? 'unlocked' : 'locked'} successfully for ${college.collegeName}.`,
      college: {
        _id: college._id,
        collegeName: college.collegeName,
        isPremiumUnlocked: college.isPremiumUnlocked,
        unlockedModules: college.unlockedModules
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle module', error: error.message });
  }
};
