import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/campus_complaint.dart';
import '../../services/campus_environment_service.dart';
import '../../core/constants.dart';
import '../student/complaint_details_screen.dart';

class AdminComplaintsListScreen extends StatefulWidget {
  const AdminComplaintsListScreen({super.key});

  @override
  State<AdminComplaintsListScreen> createState() => _AdminComplaintsListScreenState();
}

class _AdminComplaintsListScreenState extends State<AdminComplaintsListScreen> {
  final CampusEnvironmentService _service = CampusEnvironmentService();
  List<CampusComplaint> _complaints = [];
  bool _isLoading = true;
  String _selectedStatus = 'All';

  @override
  void initState() {
    super.initState();
    _fetchComplaints();
  }

  Future<void> _fetchComplaints() async {
    try {
      final data = await _service.getAllComplaints();
      if (mounted) {
        setState(() {
          _complaints = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<CampusComplaint> get _filteredComplaints {
    if (_selectedStatus == 'All') return _complaints;
    return _complaints.where((c) => c.status.toLowerCase() == _selectedStatus.toLowerCase()).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Campus Complaints', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black,
        actions: [
          IconButton(onPressed: _fetchComplaints, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: Column(
        children: [
          _buildStatusFilter(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredComplaints.isEmpty
                    ? const Center(child: Text('No complaints found.'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _filteredComplaints.length,
                        itemBuilder: (context, index) {
                          final complaint = _filteredComplaints[index];
                          return _buildComplaintCard(complaint);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusFilter() {
    final statuses = ['All', 'pending', 'in_review', 'resolved', 'rejected'];
    return SizedBox(
      height: 50,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: statuses.length,
        itemBuilder: (context, index) {
          final status = statuses[index];
          final isSelected = _selectedStatus == status;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(status.toUpperCase()),
              selected: isSelected,
              onSelected: (val) => setState(() => _selectedStatus = status),
              selectedColor: AppConstants.primaryColor,
              labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black, fontSize: 10),
            ),
          );
        },
      ),
    );
  }

  Widget _buildComplaintCard(CampusComplaint complaint) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        title: Text(complaint.issueType, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(complaint.description, maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Text('From: ${complaint.student.fullName}', style: const TextStyle(fontSize: 12, color: AppConstants.primaryColor)),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildStatusBadge(complaint.status),
            const SizedBox(height: 4),
            Text(DateFormat('MMM d').format(complaint.createdAt), style: const TextStyle(fontSize: 10, color: Colors.grey)),
          ],
        ),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ComplaintDetailsScreen(complaintId: complaint.id)),
        ).then((_) => _fetchComplaints()),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status) {
      case 'pending': color = Colors.orange; break;
      case 'in_review': color = Colors.blue; break;
      case 'resolved': color = Colors.green; break;
      case 'rejected': color = Colors.red; break;
      default: color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
      child: Text(status.toUpperCase(), style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}
