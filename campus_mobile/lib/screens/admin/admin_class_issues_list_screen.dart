import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/class_issue.dart';
import '../../services/class_issue_service.dart';
import '../../core/constants.dart';
import '../student/class_issue_details_screen.dart';

class AdminClassIssuesListScreen extends StatefulWidget {
  const AdminClassIssuesListScreen({super.key});

  @override
  State<AdminClassIssuesListScreen> createState() => _AdminClassIssuesListScreenState();
}

class _AdminClassIssuesListScreenState extends State<AdminClassIssuesListScreen> {
  final ClassIssueService _service = ClassIssueService();
  List<ClassIssue> _issues = [];
  bool _isLoading = true;
  String _selectedStatus = 'All';

  @override
  void initState() {
    super.initState();
    _fetchIssues();
  }

  Future<void> _fetchIssues() async {
    try {
      final data = await _service.getAllIssues();
      if (mounted) {
        setState(() {
          _issues = data;
          _isLoading = false;
        });
      }
    } catch (e, stacktrace) {
      debugPrint('Error fetching all class issues: $e\n$stacktrace');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<ClassIssue> get _filteredIssues {
    if (_selectedStatus == 'All') return _issues;
    return _issues.where((i) => i.status.toLowerCase() == _selectedStatus.toLowerCase()).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Classroom Issues', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black,
        actions: [
          IconButton(onPressed: _fetchIssues, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: Column(
        children: [
          _buildStatusFilter(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredIssues.isEmpty
                    ? const Center(child: Text('No issues found.'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _filteredIssues.length,
                        itemBuilder: (context, index) {
                          final issue = _filteredIssues[index];
                          return _buildIssueCard(issue);
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

  Widget _buildIssueCard(ClassIssue issue) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        title: Text(issue.issueType, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${issue.campusName ?? issue.building} - ${issue.classroom}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 4),
            Text('From: ${issue.student.fullName}', style: const TextStyle(fontSize: 12, color: AppConstants.primaryColor)),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildStatusBadge(issue.status),
            const SizedBox(height: 4),
            Text(DateFormat('MMM d').format(issue.createdAt), style: const TextStyle(fontSize: 10, color: Colors.grey)),
          ],
        ),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ClassIssueDetailsScreen(issueId: issue.id)),
        ).then((_) => _fetchIssues()),
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
