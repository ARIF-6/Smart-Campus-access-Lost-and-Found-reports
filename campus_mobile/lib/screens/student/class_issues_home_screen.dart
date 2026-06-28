import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/class_issue_provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/constants.dart';
import '../../widgets/issue_card.dart';
import 'class_issue_form_screen.dart';
import 'class_issue_details_screen.dart';
import 'package:flutter_animate/flutter_animate.dart';

class ClassIssuesHomeScreen extends StatefulWidget {
  const ClassIssuesHomeScreen({super.key});

  @override
  State<ClassIssuesHomeScreen> createState() => _ClassIssuesHomeScreenState();
}

class _ClassIssuesHomeScreenState extends State<ClassIssuesHomeScreen> {
  String? _selectedStatus; // null = all
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final classProvider = Provider.of<ClassIssueProvider>(context, listen: false);
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        classProvider.fetchIssues();
        final userClassId = authProvider.user?['classId']?.toString() ?? '';
        if (userClassId.isNotEmpty) {
          classProvider.joinClassRoom(userClassId);
          classProvider.fetchIssues();
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<ClassIssueProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final isLeader = authProvider.user?['role'] == 'classLeader' || authProvider.role == 'classLeader';
    final userClassId = authProvider.classId ?? authProvider.user?['classId']?.toString() ?? '';

    // Filter issues by the current user's classId.
    // If userClassId is null (e.g., admin), we might want to show all or handle differently,
    // but the requirement says "Only show issues belonging to same class".
    final allIssues = provider.issues.where((issue) {
      if (userClassId.isEmpty) return true;
      return issue.classId == userClassId;
    }).toList();

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Class Issues', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppConstants.textPrimary,
        elevation: 0,
      ),
      body: Column(
        children: [
          _buildStatusCards(allIssues),
          Expanded(
            child: _buildBody(
              provider,
              _selectedStatus == null || _selectedStatus == 'All'
                  ? allIssues
                  : allIssues.where((i) => i.status == _selectedStatus).toList(),
            ),
          ),
        ],
      ),
      floatingActionButton: isLeader
          ? FloatingActionButton(
              onPressed: () async {
                // Navigate to create issue screen and refresh on return
                await Navigator.push(context, MaterialPageRoute(builder: (_) => const ClassIssueFormScreen()));
                // Refresh issues after returning
                provider.fetchIssues();
              },
              backgroundColor: AppConstants.primaryColor,
              child: const Icon(Icons.add, color: Colors.white),
            )
          : null,
    );
  }

  Widget _buildStatusCards(List issues) {
    final pendingCount = issues.where((i) => i.status == 'pending').length;
    final resolvedCount = issues.where((i) => i.status == 'resolved').length;
    final rejectedCount = issues.where((i) => i.status == 'rejected').length;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _statusCard('Pending', Colors.yellow, pendingCount, 'pending'),
          _statusCard('Resolved', Colors.green, resolvedCount, 'resolved'),
          _statusCard('Rejected', Colors.red, rejectedCount, 'rejected'),
        ],
      ),
    );
  }

  Widget _statusCard(String label, Color color, int count, String status) {
    final isSelected = _selectedStatus == status;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedStatus = isSelected ? null : status),
        child: Card(
          color: isSelected ? color.withValues(alpha: 0.7) : color,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(label,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 8),
                Text('$count',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBody(ClassIssueProvider provider, List issues) {
    if (provider.isLoading && issues.isEmpty) {
      return ListView.builder(
        itemCount: 5,
        padding: const EdgeInsets.only(top: 16),
        itemBuilder: (_, __) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Container(
            height: 250,
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(18),
            ),
          ).animate(onPlay: (controller) => controller.repeat()).shimmer(
            duration: const Duration(seconds: 2),
            color: Colors.white54,
          ),
        ),
      );
    }

    if (issues.isEmpty) {
      return RefreshIndicator(
        onRefresh: provider.fetchIssues,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Container(
            height: MediaQuery.of(context).size.height * 0.6,
            alignment: Alignment.center,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.inbox_rounded, size: 60, color: Colors.grey.shade300),
                const SizedBox(height: 16),
                Text('No issues found.', style: TextStyle(color: Colors.grey.shade500)),
              ],
            ),
          ),
        ),
      );
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    return RefreshIndicator(
      onRefresh: provider.fetchIssues,
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 16, bottom: 80),
        itemCount: issues.length,
        itemBuilder: (context, index) {
          final issue = issues[index];
          final isOwner = issue.student.id == (authProvider.user?['_id'] ?? '');
          final isSupportDisabled = issue.status != 'pending' || isOwner;
          return IssueCard(
            title: issue.title,
            description: issue.description,
            imageUrl: issue.fullImageUrls.isNotEmpty ? issue.fullImageUrls.first : '',
            subtitle: '${issue.building} • ${issue.classroom}',
            status: issue.status,
            supportCount: issue.supportCount,
            createdAt: issue.createdAt,
            onSupport: () => provider.supportIssue(issue.id),
            onSeeDetails: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ClassIssueDetailsScreen(issueId: issue.id),
                ),
              ).then((_) => provider.fetchIssues());
            },
            isSupportDisabled: isSupportDisabled,
            isOwner: isOwner,
          );
        },
      ),
    );
  }
}
