import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import 'scanner_screen.dart';
import 'access_logs_screen.dart';
import 'incidents_screen.dart';
import 'visitors_screen.dart';
import 'blacklist_screen.dart';
import 'security_reports_screen.dart';
import '../student/notifications_screen.dart';
import '../../services/socket_service.dart';
import '../../widgets/dashboard_hero_header.dart';

/* ─────────────────────────────────────────────
   Tactile Scaling Action Card Widget
───────────────────────────────────────────── */
class AnimatedActionCard extends StatefulWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const AnimatedActionCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  State<AnimatedActionCard> createState() => _AnimatedActionCardState();
}

class _AnimatedActionCardState extends State<AnimatedActionCard>
    with TickerProviderStateMixin {
  bool _isHovered = false;
  late AnimationController _pressController;
  late AnimationController _entranceController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    // Press scale animation
    _pressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
      lowerBound: 0.93,
      upperBound: 1.0,
    )..value = 1.0;
    _scaleAnimation = _pressController;

    // Entrance animation
    _entranceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 450),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _entranceController,
      curve: Curves.easeOut,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.18),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _entranceController,
      curve: Curves.easeOutCubic,
    ));

    // Stagger entrance slightly
    Future.delayed(const Duration(milliseconds: 80), () {
      if (mounted) _entranceController.forward();
    });
  }

  @override
  void dispose() {
    _pressController.dispose();
    _entranceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: MouseRegion(
          onEnter: (_) => setState(() => _isHovered = true),
          onExit: (_) => setState(() => _isHovered = false),
          child: GestureDetector(
            onTapDown: (_) => _pressController.reverse(),
            onTapUp: (_) {
              _pressController.forward();
              widget.onTap();
            },
            onTapCancel: () => _pressController.forward(),
            child: AnimatedScale(
              scale: _isHovered ? 1.05 : 1.0,
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOut,
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: widget.color.withOpacity(0.12),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                    border: Border.all(color: widget.color.withOpacity(0.1), width: 1.5),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: Stack(
                      children: [
                        Positioned(
                          top: 0,
                          left: 0,
                          child: Container(
                            width: 60,
                            height: 4,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [widget.color, widget.color.withOpacity(0.0)],
                              ),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(11),
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [
                                          widget.color.withOpacity(0.18),
                                          widget.color.withOpacity(0.05),
                                        ],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      ),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: widget.color.withOpacity(0.2),
                                        width: 1,
                                      ),
                                    ),
                                    child: Icon(widget.icon, color: widget.color, size: 22),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.all(5),
                                    decoration: BoxDecoration(
                                      color: widget.color.withOpacity(0.08),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(Icons.arrow_forward_ios_rounded,
                                        size: 10, color: widget.color),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    widget.title,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 14,
                                      color: Color(0xFF0F172A),
                                      letterSpacing: -0.3,
                                      height: 1.2,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    widget.subtitle,
                                    style: const TextStyle(
                                      color: Color(0xFF64748B),
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w600,
                                      height: 1.2,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/* ─────────────────────────────────────────────
   Security Dashboard Screen
───────────────────────────────────────────── */
class SecurityDashboard extends StatefulWidget {
  final VoidCallback? openDrawer;
  const SecurityDashboard({super.key, this.openDrawer});

  @override
  State<SecurityDashboard> createState() => _SecurityDashboardState();
}

class _SecurityDashboardState extends State<SecurityDashboard> {
  final ApiService _api = ApiService();
  Map<String, dynamic> _live = {};
  bool _liveLoading = true;
  final SocketService _socketService = SocketService();
  Timer? _ticker;
  bool _use12h = false; // false = 24h, true = 12h AM/PM

  String _fmtTimeStr(String timeStr) {
    if (timeStr.isEmpty) return timeStr;
    try {
      final parts = timeStr.split(':').map(int.parse).toList();
      final isPm = parts[0] >= 12;
      final hr = parts[0] % 12 == 0 ? 12 : parts[0] % 12;
      final min = parts[1].toString().padLeft(2, '0');
      return "$hr:$min ${isPm ? 'PM' : 'AM'}";
    } catch (_) {
      return timeStr;
    }
  }

  @override
  void initState() {
    super.initState();
    _fetchLive();
    _ticker = Timer.periodic(const Duration(seconds: 30), (_) {
      _fetchLive();
    });
    _socketService.on('dashboard:refresh', (data) {
      if (mounted) _fetchLive();
    });
  }

  @override
  void dispose() {
    _socketService.off('dashboard:refresh');
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _fetchLive() async {
    try {
      final results = await Future.wait<dynamic>([
        _api.get('/security/live'),
        _api.get('/security/shifts/active'),
      ]);
      if (mounted) {
        setState(() {
          _live = results[0].data;
          _liveLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _liveLoading = false);
    }
  }

  String _getProfileImageUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    String p = path.replaceAll('\\', '/');
    if (p.startsWith('/')) p = p.substring(1);
    return '${AppConstants.serverUrl}/$p';
  }

  bool _isWithinShiftWindow(Map<String, dynamic>? user) {
    if (user == null) return false;
    final role = (user['role'] as String?)?.toLowerCase();
    if (role == 'admin' || role == 'superadmin' || role == 'staff') return true;

    final now = DateTime.now();
    final nowMins = now.hour * 60 + now.minute;

    final startStr = user['shiftStartTime'] as String? ?? '';
    final endStr   = user['shiftEndTime']   as String? ?? '';

    if (startStr.isNotEmpty && endStr.isNotEmpty) {
      try {
        final sParts = startStr.split(':').map(int.parse).toList();
        final eParts = endStr.split(':').map(int.parse).toList();
        final startMins = sParts[0] * 60 + sParts[1];
        final endMins   = eParts[0] * 60 + eParts[1];
        if (startMins <= endMins) {
          return nowMins >= startMins && nowMins <= endMins;
        } else {
          return nowMins >= startMins || nowMins <= endMins;
        }
      } catch (_) {}
    }

    final assignedShift = (user['assignedShift'] as String? ?? 'none').toLowerCase();
    if (assignedShift == 'morning')   return nowMins >= (5 * 60) && nowMins <= (13 * 60 + 29);
    if (assignedShift == 'afternoon') return nowMins >= (13 * 60 + 30) && nowMins <= (18 * 60);
    return false;
  }

  String _getShiftWindowMessage(Map<String, dynamic>? user) {
    if (user == null) return 'No shift information available.';
    final startStr = user['shiftStartTime'] as String? ?? '';
    final endStr   = user['shiftEndTime']   as String? ?? '';
    if (startStr.isNotEmpty && endStr.isNotEmpty) {
      return 'Your assigned shift window is $startStr – $endStr.';
    }
    final assignedShift = (user['assignedShift'] as String? ?? 'none').toLowerCase();
    if (assignedShift == 'morning')   return 'Your shift runs 05:00 – 13:29 (Morning).';
    if (assignedShift == 'afternoon') return 'Your shift runs 13:30 – 18:00 (Afternoon).';
    return 'No shift has been assigned to you yet. Contact an administrator.';
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final photoUrl = _getProfileImageUrl(user?['photoUrl']);
    final withinWindow = _isWithinShiftWindow(user);



    return Scaffold(
      backgroundColor: AppConstants.primaryNavy,
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: Stack(
          children: [
            Positioned(top: -80, right: -80, child: Container(width: 280, height: 280, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.04)))),
            Positioned(top: 80, right: -120, child: Container(width: 200, height: 200, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.03)))),

            RefreshIndicator(
              onRefresh: () async {
                await _fetchLive();
              },
              color: AppConstants.primaryNavy,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // Sliver Navy Header
                  SliverToBoxAdapter(
                    child: DashboardHeroHeader(
                      fullName: user?['fullName'] ?? 'Officer',
                      subtitle: 'Good ${_greeting()} 👋',
                      photoUrl: photoUrl,
                      onNotificationTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const NotificationsScreen(),
                        ),
                      ),
                      trailingAction: IconButton(
                        icon: const Icon(Icons.menu_rounded, color: Colors.white, size: 24),
                        onPressed: widget.openDrawer,
                      ),
                      badgeRow: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.14),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 7,
                                  height: 7,
                                  decoration: BoxDecoration(
                                    color: withinWindow ? const Color(0xFF22C55E) : const Color(0xFFEF4444),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  withinWindow ? 'IN SHIFT WINDOW' : 'OUTSIDE SHIFT',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Content Sheet
                  SliverToBoxAdapter(
                    child: Container(
                      constraints: BoxConstraints(minHeight: MediaQuery.of(context).size.height * 0.72),
                      decoration: const BoxDecoration(
                        color: AppConstants.backgroundColor,
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(36),
                          topRight: Radius.circular(36),
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Live Campus Status Section
                            const Text(
                              'Live Campus Status',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0D1B38)),
                            ),
                            const SizedBox(height: 14),
                            if (!_liveLoading) ...[
                              TweenAnimationBuilder<double>(
                                tween: Tween<double>(begin: 0.9, end: 1.0),
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeOutBack,
                                builder: (context, scale, child) {
                                  return Transform.scale(
                                    scale: scale,
                                    child: child,
                                  );
                                },
                                child: Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(22),
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFF0D1F4E), AppConstants.primaryNavy, Color(0xFF1E4080)],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    borderRadius: BorderRadius.circular(26),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppConstants.primaryNavy.withValues(alpha: 0.35),
                                        blurRadius: 28,
                                        offset: const Offset(0, 12),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          _liveStatModern('Inside', '${_live['inside'] ?? 0}', Icons.people_outline, Colors.white),
                                          Container(height: 36, width: 1, color: Colors.white24),
                                          _liveStatModern('Entries', '${_live['entries'] ?? 0}', Icons.login_rounded, const Color(0xFF22C55E)),
                                          Container(height: 36, width: 1, color: Colors.white24),
                                          _liveStatModern('Exits', '${_live['exits'] ?? 0}', Icons.logout_rounded, const Color(0xFFEF4444)),
                                        ],
                                      ),
                                      const Padding(
                                        padding: EdgeInsets.symmetric(vertical: 16),
                                        child: Divider(color: Colors.white12, height: 1),
                                      ),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                                        children: [
                                          _liveStatModern('Incidents', '${_live['todayIncidents'] ?? 0}', Icons.warning_amber_rounded, Colors.orangeAccent),
                                          _liveStatModern('Visitors', '${_live['todayVisitors'] ?? 0}', Icons.person_add_alt_1_rounded, Colors.cyanAccent),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 28),
                            ],

                            // Security Controls Section
                            const Text(
                              'Security Controls',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0D1B38)),
                            ),
                            const SizedBox(height: 14),

                            // Grid of action cards
                            GridView.count(
                              crossAxisCount: 2,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                              childAspectRatio: 1.18, // Adjusted to avoid any vertical overflow
                              children: [
                                AnimatedActionCard(title: 'QR Scanner', subtitle: 'Scan student ID', icon: Icons.qr_code_scanner_rounded, color: const Color(0xFF1A73E8), onTap: () => _go(const ScannerScreen())),
                                AnimatedActionCard(title: 'Access Logs', subtitle: 'Entry & exit history', icon: Icons.list_alt_rounded, color: const Color(0xFF1E8E3E), onTap: () => _go(const AccessLogsScreen())),
                                AnimatedActionCard(title: 'Visitor Reg.', subtitle: 'Register visitors', icon: Icons.person_add_alt_1_rounded, color: const Color(0xFF00695C), onTap: () => _go(const VisitorsScreen())),
                                AnimatedActionCard(title: 'Incidents', subtitle: 'Report events', icon: Icons.warning_amber_rounded, color: const Color(0xFFD93025), onTap: () => _go(const IncidentsScreen())),
                                AnimatedActionCard(title: 'Blacklist', subtitle: 'Manage blacklist', icon: Icons.block_flipped, color: const Color(0xFF8B0000), onTap: () => _go(const BlacklistScreen())),
                                AnimatedActionCard(title: 'Reports', subtitle: 'Daily/monthly stats', icon: Icons.bar_chart_rounded, color: const Color(0xFFF57C00), onTap: () => _go(const SecurityReportsScreen())),
                              ],
                            ),
                            const SizedBox(height: 20),

                            // Assigned Shift Card
                            Container(
                              width: double.infinity,
                              decoration: BoxDecoration(
                                color: Colors.blue.shade50,
                                border: Border.all(color: Colors.blue.shade200),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.calendar_today_rounded, color: Colors.blue, size: 32),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              const Text(
                                                'Assigned Shift',
                                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0D47A1)),
                                              ),
                                              GestureDetector(
                                                onTap: () => setState(() => _use12h = !_use12h),
                                                child: Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: _use12h ? const Color(0xFF0D47A1) : Colors.white,
                                                    borderRadius: BorderRadius.circular(12),
                                                    border: Border.all(color: const Color(0xFF0D47A1), width: 1),
                                                  ),
                                                  child: Text(
                                                    _use12h ? 'AM/PM' : '24H',
                                                    style: TextStyle(
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.bold,
                                                      color: _use12h ? Colors.white : const Color(0xFF0D47A1),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            (user?['assignedShift'] as String?) != null && (user?['assignedShift'] as String?) != 'none'
                                                ? (user!['assignedShift'] as String).toUpperCase()
                                                : 'NOT ASSIGNED',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.black87),
                                          ),
                                          if ((user?['shiftStartTime'] as String?) != null &&
                                              (user?['shiftStartTime'] as String?)!.isNotEmpty &&
                                              (user?['shiftEndTime'] as String?) != null &&
                                              (user?['shiftEndTime'] as String?)!.isNotEmpty) ...[
                                            const SizedBox(height: 6),
                                            Row(
                                              children: [
                                                const Icon(Icons.access_time_rounded, size: 13, color: Color(0xFF1565C0)),
                                                const SizedBox(width: 4),
                                                Text(
                                                  _use12h
                                                      ? '${_fmtTimeStr(user!['shiftStartTime'])}  –  ${_fmtTimeStr(user['shiftEndTime'])}'
                                                      : '${user!['shiftStartTime']}  –  ${user['shiftEndTime']}',
                                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1565C0)),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _liveStatModern(String label, String val, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(
          val,
          style: TextStyle(
              color: color,
              fontSize: 24,
              fontWeight: FontWeight.bold,
              letterSpacing: -1),
        ),
        Text(
          label.toUpperCase(),
          style: const TextStyle(
              color: Colors.white60,
              fontSize: 9,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5),
        ),
      ],
    );
  }

  void _go(Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen))
        .then((_) => _fetchLive());
  }
}
