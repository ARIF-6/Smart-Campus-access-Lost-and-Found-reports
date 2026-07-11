import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/campus_issue_provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/constants.dart';
import '../../widgets/issue_card.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'campus_issue_details_screen.dart';

class CampusIssuesHomeScreen extends StatefulWidget {
  const CampusIssuesHomeScreen({super.key});

  @override
  State<CampusIssuesHomeScreen> createState() => _CampusIssuesHomeScreenState();
}

class _CampusIssuesHomeScreenState extends State<CampusIssuesHomeScreen> {
  String? _selectedStatus; // null = all

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        Provider.of<CampusIssueProvider>(context, listen: false).fetchIssues();
      }
    });
  }

  Future<void> _supportIssue(dynamic issue) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final currentUser = authProvider.user;
    final isOwner = currentUser != null &&
        (currentUser['studentId'] == issue.studentId || currentUser['email'] == issue.studentEmail);
    final isPending = issue.status.toLowerCase() == 'pending';
    
    if (isOwner || !isPending) {
      return;
    }

    try {
      final provider = Provider.of<CampusIssueProvider>(context, listen: false);
      await provider.supportIssue(issue.id);
      
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Success', style: TextStyle(fontWeight: FontWeight.bold)),
            content: const Text('Support recorded successfully.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Got It'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to record support. Please try again later.'),
            backgroundColor: AppConstants.errorColor,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<CampusIssueProvider>(context);
    final issues = provider.issues;

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Campus Issues', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppConstants.textPrimary,
        elevation: 0,
      ),
      body: Column(
        children: [
          _buildStatusCards(provider.issues),
          Expanded(child: _buildBody(provider, issues)),
        ],
      ),
    );
  }

  Widget _buildBody(CampusIssueProvider provider, List issues) {
    // Apply status filtering
    final filtered = _selectedStatus == null
        ? issues
        : issues.where((i) => i.status == _selectedStatus).toList();

    if (provider.isLoading && filtered.isEmpty) {
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

    if (filtered.isEmpty) {
      return RefreshIndicator(
        onRefresh: provider.fetchIssues,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Container(
            height: MediaQuery.of(context).size.height * 0.8,
            alignment: Alignment.center,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.campaign_rounded, size: 60, color: Colors.grey.shade300),
                const SizedBox(height: 16),
                Text('No campus issues found.', style: TextStyle(color: Colors.grey.shade500)),
              ],
            ),
          ),
        ),
      );
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final currentUser = authProvider.user;

    return RefreshIndicator(
      onRefresh: provider.fetchIssues,
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 16, bottom: 80),
        itemCount: filtered.length,
        itemBuilder: (context, index) {
          final issue = filtered[index];
          final isOwner = currentUser != null &&
              (currentUser['studentId'] == issue.studentId || currentUser['email'] == issue.studentEmail);
          final isSupportDisabled = isOwner || issue.status.toLowerCase() != 'pending';

          return IssueCard(
            title: issue.title,
            description: issue.description,
            imageUrl: issue.imageUrl.isNotEmpty ? AppConstants.getImageUrl(issue.imageUrl) : '',
            subtitle: '${issue.location} • By ${issue.reporterType}',
            status: issue.status,
            supportCount: issue.supportCount,
            createdAt: issue.createdAt,
            isSupportDisabled: isSupportDisabled,
            isOwner: isOwner,
            onSupport: () => _supportIssue(issue),
            onSeeDetails: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => CampusIssueDetailsScreen(issueId: issue.id),
                ),
              );
            },
          );
        },
      ),
    );
  }

  // Status cards widget
  Widget _buildStatusCards(List issues) {
    final pending = issues.where((i) => i.status.toLowerCase() == 'pending').length;
    final resolved = issues.where((i) => i.status.toLowerCase() == 'resolved').length;
    final rejected = issues.where((i) => i.status.toLowerCase() == 'rejected').length;

    Widget card(String label, int count, Color color, String status) {
      return Expanded(
        child: InkWell(
          onTap: () {
            setState(() {
              _selectedStatus = status;
            });
          },
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: color == Colors.black87 ? color : color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  count.toString(),
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: color == Colors.black87 ? Colors.white : color,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: TextStyle(
                    color: color == Colors.black87 ? Colors.white : color,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Row(
      children: [
        card('Pending', pending, Colors.black87, 'pending'),
        card('Resolved', resolved, Colors.green, 'resolved'),
        card('Rejected', rejected, Colors.red, 'rejected'),
      ],
    );
  }
}
