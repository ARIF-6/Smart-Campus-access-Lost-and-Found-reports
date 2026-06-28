import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/constants.dart';

class SecurityMenuScreen extends StatelessWidget {
  final Function(int) onMenuItemClicked;
  final int selectedIndex;

  const SecurityMenuScreen({
    super.key,
    required this.onMenuItemClicked,
    required this.selectedIndex,
  });

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final fullName = user?['fullName'] ?? 'Officer';

    return Scaffold(
      backgroundColor: AppConstants.primaryColor,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 40, 24, 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const CircleAvatar(
                    radius: 35,
                    backgroundColor: Colors.white,
                    child: Icon(Icons.security, size: 35, color: AppConstants.primaryColor),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    fullName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Text(
                    'Campus Sentinel',
                    style: TextStyle(color: Colors.white60, fontSize: 13),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  _menuItem(0, Icons.dashboard_outlined, 'Dashboard'),
                  _menuItem(1, Icons.list_alt_outlined, 'Access Logs'),
                  _menuItem(2, Icons.warning_amber_outlined, 'Incidents'),
                  _menuItem(3, Icons.person_outline, 'Profile'),
                  const Divider(color: Colors.white24, height: 40),
                  _menuItem(4, Icons.settings_outlined, 'Settings'),
                  _menuItem(5, Icons.help_outline, 'Help & Support'),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: InkWell(
                onTap: () => auth.logout(),
                child: const Row(
                  children: [
                    Icon(Icons.logout, color: Colors.white70),
                    SizedBox(width: 12),
                    Text(
                      'Logout',
                      style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _menuItem(int index, IconData icon, String title) {
    final isSelected = selectedIndex == index;
    return ListTile(
      onTap: () => onMenuItemClicked(index),
      leading: Icon(icon, color: isSelected ? Colors.white : Colors.white60),
      title: Text(
        title,
        style: TextStyle(
          color: isSelected ? Colors.white : Colors.white60,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      selected: isSelected,
      selectedTileColor: Colors.white.withValues(alpha: 0.1),
    );
  }
}
