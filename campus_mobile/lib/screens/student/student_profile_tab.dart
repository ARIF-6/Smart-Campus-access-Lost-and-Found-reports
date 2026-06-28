import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../settings_screen.dart';
import '../../providers/auth_provider.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';

const _navy = Color(0xFF1B3A6B);
const _navyDk = Color(0xFF0D1F4E);
const _bg = Color(0xFFF4F7FB);
const _txtDark = Color(0xFF0D1B38);
const _txtGrey = Color(0xFF6B7FA3);

class StudentProfileTab extends StatefulWidget {
  const StudentProfileTab({super.key});

  @override
  State<StudentProfileTab> createState() => _StudentProfileTabState();
}

class _StudentProfileTabState extends State<StudentProfileTab> {
  final ApiService _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _fetchProfile();
    });
  }

  Future<void> _fetchProfile() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    try {
      final response = await _apiService.get('/auth/profile');
      if (response.statusCode == 200 && response.data != null && mounted) {
        auth.updateUserLocally(response.data);
      }
    } catch (e) {
      debugPrint('Profile fetch error: $e');
    }
  }

  String _imgUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    String p = path.replaceAll('\\', '/');
    if (p.startsWith('/')) p = p.substring(1);
    return '${AppConstants.serverUrl}/$p';
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final fullName = user?['fullName'] ?? 'Student Name';
    final studentId = user?['studentId'] ?? '—';
    // final email      = user?['email']      ?? '—';
    final faculty = user?['faculty'] ?? 'faculty';
    final department = user?['department'] ?? '—';
    final classLabel = user?['class'] ?? user?['className'] ?? '—';
    final photoUrl = _imgUrl(user?['photoUrl']);

    return Scaffold(
      backgroundColor: _bg,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // ── Navy Header ──────────────────────────────────────────
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [_navyDk, _navy, Color(0xFF1E4080)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(36),
                  bottomRight: Radius.circular(36),
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 20, 22, 36),
                  child: Column(
                    children: [
                      // Top bar
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('My Profile',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800)),
                          IconButton(
                            icon: const Icon(Icons.settings_outlined,
                                color: Colors.white70, size: 22),
                            onPressed: () =>
                                Navigator.push(context, SettingsScreen.route()),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      // Avatar
                      Stack(
                        alignment: Alignment.bottomRight,
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.35),
                                  width: 3),
                              boxShadow: [
                                BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.2),
                                    blurRadius: 18,
                                    offset: const Offset(0, 6)),
                              ],
                            ),
                            child: CircleAvatar(
                              radius: 46,
                              backgroundColor: Colors.white24,
                              backgroundImage: photoUrl.isNotEmpty
                                  ? NetworkImage(photoUrl)
                                  : null,
                              child: photoUrl.isEmpty
                                  ? Text(
                                      fullName.isNotEmpty
                                          ? fullName[0].toUpperCase()
                                          : 'S',
                                      style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 32,
                                          fontWeight: FontWeight.bold))
                                  : null,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(
                                color: Color(0xFF22C55E),
                                shape: BoxShape.circle),
                            child: const Icon(Icons.check_rounded,
                                color: Colors.white, size: 12),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      // Name
                      Text(fullName,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w800)),
                      const SizedBox(height: 5),
                      // Role badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                              color: Colors.white.withValues(alpha: 0.25)),
                        ),
                        child: Text('Student · $studentId',
                            style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.85),
                                fontSize: 12,
                                fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // ── Content ──────────────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 100),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Info card (banking-style)
                _sectionCard('Account Information', [
                  _infoRow(Icons.badge_outlined, 'Student ID', studentId),
                  // _infoRow(Icons.email_outlined,        'Email',       email),
                  _infoRow(Icons.school_outlined, 'Faculty', faculty),
                  _infoRow(Icons.business_outlined, 'Department', department),
                  _infoRow(Icons.class_outlined, 'Class', classLabel),
                ]),
                const SizedBox(height: 18),

                // Actions card
                _sectionCard('Account', [
                  _actionRow(
                    icon: Icons.settings_outlined,
                    label: 'Settings',
                    color: _navy,
                    onTap: () =>
                        Navigator.push(context, SettingsScreen.route()),
                  ),
                  const Divider(height: 1, indent: 56),
                  _actionRow(
                    icon: Icons.logout_rounded,
                    label: 'Sign Out',
                    color: const Color(0xFFEF4444),
                    onTap: () => _confirmLogout(context, auth),
                  ),
                ]),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  // ── Section card ───────────────────────────────────────────────────
  Widget _sectionCard(String title, List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 12,
              offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 10),
            child: Text(title,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: _txtGrey,
                    letterSpacing: 0.5)),
          ),
          const Divider(height: 1, indent: 18, endIndent: 18),
          ...children,
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  // ── Info row ───────────────────────────────────────────────────────
  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
                color: _navy.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: _navy, size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        fontSize: 11,
                        color: _txtGrey,
                        fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(value,
                    style: const TextStyle(
                        fontSize: 14,
                        color: _txtDark,
                        fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Action row ─────────────────────────────────────────────────────
  Widget _actionRow({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(label,
                  style: TextStyle(
                      fontSize: 15, fontWeight: FontWeight.w600, color: color)),
            ),
            Icon(Icons.chevron_right_rounded,
                color: color.withValues(alpha: 0.5), size: 20),
          ],
        ),
      ),
    );
  }

  // ── Logout confirmation ────────────────────────────────────────────
  void _confirmLogout(BuildContext ctx, AuthProvider auth) {
    showDialog(
      context: ctx,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Sign Out',
            style: TextStyle(fontWeight: FontWeight.w800, color: _txtDark)),
        content: const Text('Are you sure you want to sign out?',
            style: TextStyle(color: _txtGrey)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel',
                style: TextStyle(color: _txtGrey, fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12))),
            onPressed: () {
              Navigator.pop(ctx);
              auth.logout();
            },
            child: const Text('Sign Out',
                style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
