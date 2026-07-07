import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/shift_provider.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import 'scanner_screen.dart';
import 'access_logs_screen.dart';
import 'incidents_screen.dart';
import 'visitors_screen.dart';
import 'blacklist_screen.dart';
import 'shift_screen.dart';
import 'security_reports_screen.dart';
import '../student/notifications_screen.dart';
import '../../services/socket_service.dart';

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

  /// Returns true when the current time is inside the guard's assigned window.
  /// Keeps the dashboard in sync with the same logic used by ShiftScreen and
  /// ScannerScreen so behaviour is consistent across the app.
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

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final photoUrl = _getProfileImageUrl(user?['photoUrl']);
    final shiftProvider = Provider.of<ShiftProvider>(context);
    // Real-time check: is the current wall-clock time within the shift window?
    final withinWindow = _isWithinShiftWindow(user);

    /// Tap handler for shift-gated action cards.
    /// Only navigates when the guard has an active shift record AND the current
    /// time is within their assigned window. Otherwise shows a descriptive sheet.
    void requireShift(VoidCallback action) {
      if (!shiftProvider.hasActiveShift) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Start your shift first to access this feature.'),
            backgroundColor: Color(0xFF1B3A6B),
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }
      if (!withinWindow) {
        // Show a modal bottom sheet explaining the shift window restriction.
        showModalBottomSheet(
          context: context,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          builder: (sheetCtx) => Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.access_time_filled_rounded, size: 56, color: Colors.orange.shade700),
                const SizedBox(height: 16),
                const Text(
                  'Outside Shift Window',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 10),
                Text(
                  _getShiftWindowMessage(user),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Colors.black54, height: 1.5),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Student Entry and Exit operations are only allowed during your assigned shift window.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Colors.black38, height: 1.4),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1B3A6B),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => Navigator.pop(sheetCtx),
                    child: const Text('OK', style: TextStyle(color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        );
        return;
      }
      action();
    }

    return Scaffold(
      backgroundColor: AppConstants.primaryNavy,
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: Stack(
          children: [
            // Decorative bg circles
            Positioned(top: -80, right: -80, child: Container(width: 280, height: 280, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.04)))),
            Positioned(top: 80, right: -120, child: Container(width: 200, height: 200, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.03)))),

            RefreshIndicator(
              onRefresh: () async {
                await _fetchLive();
                await shiftProvider.fetchActiveShift();
              },
              color: AppConstants.primaryNavy,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // ── Navy Header ─────────────────────────────────────
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 56, 16, 26),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.menu_rounded, color: Colors.white, size: 24),
                                onPressed: widget.openDrawer,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Security Portal 👋',
                                        style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 11)),
                                    Text(
                                      user?['fullName'] ?? 'Officer',
                                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              Consumer<NotificationProvider>(
                                builder: (context, provider, child) {
                                  return Stack(
                                    children: [
                                      Container(
                                        decoration: BoxDecoration(
                                          color: Colors.white.withValues(alpha: 0.14),
                                          shape: BoxShape.circle,
                                        ),
                                        child: IconButton(
                                          icon: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 22),
                                          onPressed: () => Navigator.push(
                                            context,
                                            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                                          ),
                                        ),
                                      ),
                                      if (provider.unreadCount > 0)
                                        Positioned(
                                          right: 6,
                                          top: 6,
                                          child: Container(
                                            padding: const EdgeInsets.all(4),
                                            decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                            constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                                            child: Text('${provider.unreadCount}',
                                                style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                                                textAlign: TextAlign.center),
                                          ),
                                        ),
                                    ],
                                  );
                                },
                              ),
                              const SizedBox(width: 8),
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: Colors.white24,
                                backgroundImage: photoUrl.isNotEmpty ? NetworkImage(photoUrl) : null,
                                child: photoUrl.isEmpty
                                    ? Text(
                                        user?['fullName']?[0] ?? 'S',
                                        style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                                      )
                                    : null,
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          Row(
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
                                      width: 7, height: 7,
                                      decoration: BoxDecoration(
                                        color: shiftProvider.hasActiveShift ? const Color(0xFF22C55E) : const Color(0xFFEF4444),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      shiftProvider.hasActiveShift ? 'SHIFT ACTIVE' : 'NO ACTIVE SHIFT',
                                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  // ── White Bottom Content Sheet ─────────────────────
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
                            // ── Live Campus Status Card (replaces banking card) ──
                            const Text(
                              'Live Campus Status',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0D1B38)),
                            ),
                            const SizedBox(height: 14),
                            if (!_liveLoading) ...[
                              Container(
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
                              const SizedBox(height: 28),
                            ],

                            // ── Security Controls ────────────────────────────
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
                              childAspectRatio: 1.1,
                              children: [
                                _actionCard('QR Scanner', 'Scan student ID', Icons.qr_code_scanner, const Color(0xFF1A73E8), () => requireShift(() => _go(const ScannerScreen()))),
                                _actionCard('Access Logs', 'Entry & exit history', Icons.list_alt, const Color(0xFF1E8E3E), () => requireShift(() => _go(const AccessLogsScreen()))),
                                _actionCard('Visitor Reg.', 'Register campus visitors', Icons.person_add, const Color(0xFF00695C), () => requireShift(() => _go(const VisitorsScreen()))),
                                _actionCard('Incidents', 'Report security events', Icons.warning_amber_rounded, const Color(0xFFD93025), () => requireShift(() => _go(const IncidentsScreen()))),
                                _actionCard('Blacklist', 'Manage flagged persons', Icons.block, const Color(0xFF8B0000), () => requireShift(() => _go(const BlacklistScreen()))),
                                _actionCard('My Shifts', 'Shift login & history', Icons.work_history, const Color(0xFF6200EA), () => _go(const ShiftScreen())),
                                _actionCard('Reports', 'Daily & monthly stats', Icons.bar_chart, const Color(0xFFF57C00), () => requireShift(() => _go(const SecurityReportsScreen()))),
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

  Widget _actionCard(String title, String subtitle, IconData icon, Color color,
      VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.grey.shade100),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 4))
          ],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color, size: 24),
          ),
          const Spacer(),
          Text(title,
              style:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          Text(subtitle,
              style: const TextStyle(color: Colors.grey, fontSize: 11)),
        ]),
      ),
    );
  }

  void _go(Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen))
        .then((_) => _fetchLive());
  }
}
