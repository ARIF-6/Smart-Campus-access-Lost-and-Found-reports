const ClaimRequest = require('../models/ClaimRequest');
const FoundItem = require('../models/FoundItem');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { logAction } = require('../utils/auditLogger');

exports.submitClaim = async (req, res) => {
  try {
    const { foundItemId, proof } = req.body;
    
    // Check if item exists
    const foundItem = await FoundItem.findById(foundItemId);
    if (!foundItem) {
      return res.status(404).json({ message: 'Found Item not found' });
    }

    if (foundItem.status === 'CLAIMED') {
      return res.status(400).json({ message: 'This item is already claimed' });
    }

    // Check duplicate
    const existingClaim = await ClaimRequest.findOne({ userId: req.user.id, foundItemId });
    if (existingClaim) {
      return res.status(400).json({ message: 'You have already submitted a claim for this item' });
    }

    let proofUrl = proof || '';
    if (req.file) {
      proofUrl = req.file.path; // from Cloudinary
    }

    const newClaim = await ClaimRequest.create({
      userId: req.user.id,
      foundItemId,
      proof: proofUrl,
      status: 'PENDING'
    });

    // Notify Admins
    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map(admin => ({
      userId: admin._id,
      title: 'New Claim Submitted',
      message: `A new claim has been submitted for item: ${foundItem.title}`,
      type: 'CLAIM_SUBMITTED',
      relatedItemId: foundItemId
    }));
    
    if (notifications.length > 0) {
      const insertedNotifications = await Notification.insertMany(notifications);
      const io = require('../utils/socket').getIO();
      if(io) {
        insertedNotifications.forEach(notif => {
          io.to(notif.userId.toString()).emit("notification", notif);
        });
      }
    }

    // Log Audit
    await logAction({
      userId: req.user.id,
      action: 'SUBMIT_CLAIM',
      targetId: newClaim._id,
      targetType: 'Claim',
      details: `Submitted a claim for item: ${foundItem.title}`,
      req
    });

    res.status(201).json(newClaim);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getMyClaims = async (req, res) => {
  try {
    const claims = await ClaimRequest.find({ userId: req.user.id })
      .populate('foundItemId', 'title locationFound imageUrl status')
      .sort({ createdAt: -1 });
    res.status(200).json(claims);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getAllClaims = async (req, res) => {
  try {
    const claims = await ClaimRequest.find()
      .populate('foundItemId', 'title locationFound imageUrl')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(claims);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateClaimStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const claim = await ClaimRequest.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    if (claim.status !== 'PENDING') {
      return res.status(400).json({ message: 'Claim is already ' + claim.status });
    }

    claim.status = status;
    if (adminNote) claim.adminNote = adminNote;
    await claim.save();

    if (status === 'APPROVED') {
      // update item to CLAIMED
      await FoundItem.findByIdAndUpdate(claim.foundItemId, { status: 'CLAIMED' });
      
      // Reject all other claims for this item
      await ClaimRequest.updateMany(
        { foundItemId: claim.foundItemId, _id: { $ne: claim._id }, status: 'PENDING' },
        { status: 'REJECTED', adminNote: 'Automatically rejected because another claim was verified.' }
      );

      const notif = await Notification.create({
        userId: claim.userId,
        title: 'Claim Approved',
        message: 'Your claim request has been verified and approved.',
        type: 'CLAIM_APPROVED',
        relatedItemId: claim.foundItemId
      });
      const io = require('../utils/socket').getIO();
      if(io) io.to(claim.userId.toString()).emit('notification', notif);
      
    } else if (status === 'REJECTED') {
      const notif = await Notification.create({
        userId: claim.userId,
        title: 'Claim Rejected',
        message: 'Your claim request has been rejected.',
        type: 'CLAIM_REJECTED',
        relatedItemId: claim.foundItemId
      });
      const io = require('../utils/socket').getIO();
      if(io) io.to(claim.userId.toString()).emit('notification', notif);
    }

    // Log Audit
    await logAction({
      userId: req.user.id,
      action: status === 'APPROVED' ? 'APPROVE_CLAIM' : 'REJECT_CLAIM',
      targetId: claim._id,
      targetType: 'Claim',
      details: `${status} claim request for user ${claim.userId}`,
      req
    });

    res.status(200).json(claim);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
