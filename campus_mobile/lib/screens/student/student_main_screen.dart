import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import 'student_home_tab.dart';
import 'claims_screen.dart';
import 'my_items_screen.dart';
import 'student_profile_tab.dart';
import 'student_report_item_screen.dart';
import 'campus_complaint_screen.dart';
import 'class_issue_form_screen.dart';
import '../../services/socket_service.dart';

const _navyPrimary = Color(0xFF1B3A6B);

class StudentMainScreen extends StatefulWidget {
  const StudentMainScreen({super.key});

  @override
  State<StudentMainScreen> createState() => StudentMainScreenState();
}

class StudentMainScreenState extends State<StudentMainScreen> {
  int _currentIndex = 0;
  set currentIndex(int i) => setState(() => _currentIndex = i);

  final SocketService _socketService = SocketService();

  final List<Widget> _screens = const [
    StudentHomeTab(),
    ClaimsScreen(),
    MyItemsScreen(),
    StudentProfileTab(),
  ];

  @override
  void initState() {
    super.initState();
    _socketService.on('notification:new', (data) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(data['title'] ?? 'New Notification',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(data['message'] ?? ''),
              ],
            ),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            margin: const EdgeInsets.fromLTRB(16, 16, 16, 100),
            backgroundColor: _navyPrimary,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _socketService.off('notification:new');
    super.dispose();
  }

  void _onTabTapped(int index) {
    if (_currentIndex == index) return;
    setState(() => _currentIndex = index);
  }

  void _showActionMenu(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final bool isClassLeader = authProvider.user?['isClassLeader'] == true;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        margin: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 24, offset: const Offset(0, 10)),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 36, height: 4,
              decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(2)),
            ),
            const SizedBox(height: 20),
            const Text('New Report',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0D1B38))),
            const SizedBox(height: 14),
            _buildSheetItem(ctx,
                icon: Icons.search_off_rounded,
                color: const Color(0xFFEF4444),
                title: 'Report Lost Item',
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const StudentReportItemScreen(initialType: 'Lost')));
                }),
            _buildSheetItem(ctx,
                icon: Icons.eco_rounded,
                color: const Color(0xFF10B981),
                title: 'Campus Issue',
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const CampusComplaintScreen()));
                }),
            if (isClassLeader)
              _buildSheetItem(ctx,
                  icon: Icons.school_rounded,
                  color: _navyPrimary,
                  title: 'Class Issue',
                  subtitle: 'Class Monitor Only',
                  onTap: () {
                    Navigator.pop(ctx);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const ClassIssueFormScreen()));
                  }),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSheetItem(BuildContext ctx, {
    required IconData icon,
    required Color color,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withValues(alpha: 0.12)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Color(0xFF0D1B38))),
                    if (subtitle != null)
                      Text(subtitle,
                          style: TextStyle(fontSize: 11, color: color.withValues(alpha: 0.7), fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios_rounded, color: Colors.grey.shade400, size: 14),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        switchInCurve: Curves.easeIn,
        switchOutCurve: Curves.easeOut,
        transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: child),
        child: KeyedSubtree(key: ValueKey(_currentIndex), child: _screens[_currentIndex]),
      ),

      // ── FAB (banking "+" center button) ────────────────────────────
      floatingActionButton: Container(
        width: 58, height: 58,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF2563EB), _navyPrimary],
            begin: Alignment.topLeft, end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(color: _navyPrimary.withValues(alpha: 0.4), blurRadius: 16, offset: const Offset(0, 6)),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => _showActionMenu(context),
            borderRadius: BorderRadius.circular(20),
            child: const Icon(Icons.add_rounded, color: Colors.white, size: 30),
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,

      // ── Bottom Navigation Bar (banking floating pill) ───────────────
      bottomNavigationBar: Container(
        height: 80,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 22),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(30),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.10), blurRadius: 24, offset: const Offset(0, 8)),
          ],
        ),
        child: BottomAppBar(
          color: Colors.transparent,
          elevation: 0,
          padding: EdgeInsets.zero,
          notchMargin: 10,
          shape: const CircularNotchedRectangle(),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _navItem(0, Icons.home_rounded, Icons.home_outlined, 'Home'),
              _navItem(1, Icons.receipt_long_rounded, Icons.receipt_long_outlined, 'Claims'),
              const SizedBox(width: 60), // FAB gap
              _navItem(2, Icons.explore_rounded, Icons.explore_outlined, 'Items'),
              _navItem(3, Icons.person_rounded, Icons.person_outline_rounded, 'Profile'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navItem(int index, IconData activeIcon, IconData inactiveIcon, String label) {
    final selected = _currentIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => _onTabTapped(index),
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: Icon(
                selected ? activeIcon : inactiveIcon,
                key: ValueKey(selected),
                color: selected ? _navyPrimary : Colors.grey.shade400,
                size: 26,
              ),
            ),
            const SizedBox(height: 4),
            Text(label,
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                    color: selected ? _navyPrimary : Colors.grey.shade400)),
          ],
        ),
      ),
    );
  }
}
