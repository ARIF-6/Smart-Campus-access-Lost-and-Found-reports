const Host = require('../models/Host');

// @desc    Create a new host
// @route   POST /api/hosts
// @access  Private (Admin)
exports.createHost = async (req, res) => {
  try {
    const { name, faculty, campus, status } = req.body;

    if (!name || !campus) {
      return res.status(400).json({ success: false, message: 'Name and Campus are required' });
    }

    const host = await Host.create({
      name: name.trim(),
      faculty: faculty ? faculty.trim() : '',
      campus: campus.trim(),
      status: status || 'active',
      createdBy: req.user.id, // Assuming req.user is set by auth middleware
    });

    res.status(201).json({ success: true, data: host });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A host with this name already exists in the selected campus.' });
    }
    console.error('Error creating host:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all hosts
// @route   GET /api/hosts
// @access  Private
exports.getHosts = async (req, res) => {
  try {
    const { status, campus } = req.query;
    let query = {};
    if (status) query.status = status;
    if (campus) query.campus = campus;

    const hosts = await Host.find(query).populate('createdBy', 'fullName role email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: hosts });
  } catch (error) {
    console.error('Error fetching hosts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update a host
// @route   PUT /api/hosts/:id
// @access  Private (Admin)
exports.updateHost = async (req, res) => {
  try {
    const { name, faculty, campus, status } = req.body;
    let host = await Host.findById(req.params.id);

    if (!host) {
      return res.status(404).json({ success: false, message: 'Host not found' });
    }

    if (name) host.name = name.trim();
    if (faculty !== undefined) host.faculty = faculty.trim();
    if (campus) host.campus = campus.trim();
    if (status) host.status = status;

    await host.save();

    res.status(200).json({ success: true, data: host });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A host with this name already exists in the selected campus.' });
    }
    console.error('Error updating host:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a host
// @route   DELETE /api/hosts/:id
// @access  Private (Admin)
exports.deleteHost = async (req, res) => {
  try {
    const host = await Host.findById(req.params.id);

    if (!host) {
      return res.status(404).json({ success: false, message: 'Host not found' });
    }

    await Host.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Error deleting host:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
