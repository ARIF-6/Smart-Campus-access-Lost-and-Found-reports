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

  Future<void> _toggleSupport(dynamic issue) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final currentUser = authProvider.user;
    final isOwner = currentUser != null && issue.studentUserId != null &&
        (currentUser['_id'] == issue.studentUserId || currentUser['id'] == issue.studentUserId);
    final isPending = issue.status.toLowerCase() == 'pending';

    if (isOwner || !isPending) return;

    try {
      final provider = Provider.of<CampusIssueProvider>(context, listen: false);
      if (issue.hasUserSupported) {
        // Already supported — remove support
        await provider.removeSupport(issue.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Support removed.'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 2),
            ),
          );
        }
      } else {
        // Not yet supported — add support
        await provider.supportIssue(issue.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Support recorded successfully.'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Action failed. Please try again later.'),
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
          final isOwner = currentUser != null && issue.studentUserId != null &&
              (currentUser['_id'] == issue.studentUserId || currentUser['id'] == issue.studentUserId);
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
            hasUserSupported: issue.hasUserSupported,
            onSupport: () => _toggleSupport(issue),
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

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        children: [
          _statusCard('Pending', const Color(0xFFF59E0B), pending, 'pending', Icons.schedule_rounded),
          const SizedBox(width: 10),
          _statusCard('Resolved', const Color(0xFF10B981), resolved, 'resolved', Icons.check_circle_rounded),
          const SizedBox(width: 10),
          _statusCard('Rejected', const Color(0xFFEF4444), rejected, 'rejected', Icons.cancel_rounded),
        ],
      ),
    );
  }

  Widget _statusCard(String label, Color color, int count, String status, IconData icon) {
    final isSelected = _selectedStatus == status;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedStatus = isSelected ? null : status),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isSelected
                  ? [color, color.withOpacity(0.8)]
                  : [color.withOpacity(0.08), color.withOpacity(0.04)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? color : color.withOpacity(0.15),
              width: isSelected ? 1.5 : 1,
            ),
            boxShadow: isSelected
                ? [BoxShadow(color: color.withOpacity(0.25), blurRadius: 12, offset: const Offset(0, 6))]
                : [],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: isSelected ? Colors.white : color, size: 20),
              const SizedBox(height: 8),
              Text(
                '$count',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 22,
                  color: isSelected ? Colors.white : color,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 11,
                  color: isSelected ? Colors.white.withOpacity(0.9) : color.withOpacity(0.8),
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
