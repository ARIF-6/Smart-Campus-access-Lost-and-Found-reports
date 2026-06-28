import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/constants.dart';
import 'user_registration_screen.dart';
import 'user_list_screen.dart';
import 'admin_complaints_list_screen.dart';
import 'admin_class_issues_list_screen.dart';

class AdminDashboard extends StatelessWidget {
  const AdminDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Console'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome, ${user?['fullName'] ?? 'Admin'}',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const Text('Administrative Controls', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 32),
            _buildActionCard(
              context,
              'Register New User',
              'Create student, security, or staff accounts',
              Icons.person_add_outlined,
              AppConstants.primaryColor,
              () => Navigator.push(context, MaterialPageRoute(builder: (_) => const UserRegistrationScreen())),
            ),
            _buildActionCard(
              context,
              'User Management',
              'View and manage all system users',
              Icons.manage_accounts_outlined,
              AppConstants.secondaryColor,
              () => Navigator.push(context, MaterialPageRoute(builder: (_) => const UserListScreen())),
            ),
            const SizedBox(height: 16),
            _buildActionCard(
              context,
              'Visitor Log',
              'Monitor campus visitors and activities',
              Icons.badge_outlined,
              Colors.blue,
              () {
                // Future: Navigate to Visitor list
              },
            ),
            const SizedBox(height: 16),
            _buildActionCard(
              context,
              'Incident Reports',
              'Review security and safety incidents',
              Icons.warning_amber_rounded,
              Colors.red,
              () {
                // Future: Navigate to Incident list
              },
            ),
            const SizedBox(height: 16),
            _buildActionCard(
              context,
              'Campus Complaints',
              'Manage environment and facility issues',
              Icons.eco_outlined,
              Colors.green,
              () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminComplaintsListScreen())),
            ),
            const SizedBox(height: 16),
            _buildActionCard(
              context,
              'Classroom Issues',
              'Manage classroom-specific reports',
              Icons.school_outlined,
              Colors.indigo,
              () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminClassIssuesListScreen())),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionCard(BuildContext context, String title, String subtitle, IconData icon, Color color, VoidCallback onTap) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }
}
