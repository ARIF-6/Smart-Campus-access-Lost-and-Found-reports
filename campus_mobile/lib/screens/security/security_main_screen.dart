import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants.dart';
import '../../providers/auth_provider.dart';
import '../../providers/shift_provider.dart';
import 'security_dashboard.dart';
import 'security_profile_tab.dart';
import 'scanner_screen.dart';
import 'access_logs_screen.dart';
import 'incidents_screen.dart';
import 'visitors_screen.dart';
import 'blacklist_screen.dart';
import 'security_reports_screen.dart';

import '../../services/socket_service.dart';
import '../../providers/notification_provider.dart';
import '../../core/app_lifecycle_observer.dart';

class SecurityMainScreen extends StatefulWidget {
  const SecurityMainScreen({super.key});

  @override
  State<SecurityMainScreen> createState() => _SecurityMainScreenState();
}

class _SecurityMainScreenState extends State<SecurityMainScreen>
    with TickerProviderStateMixin {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final SocketService _socketService = SocketService();

  late AnimationController _drawerAnimController;

  @override
  void initState() {
    super.initState();

    _drawerAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Provider.of<ShiftProvider>(context, listen: false).fetchActiveShift();
      Provider.of<NotificationProvider>(context, listen: false).fetchNotifications();
      // Fetch latest profile immediately so any shift schedule change by admin is reflected
      Provider.of<AuthProvider>(context, listen: false).fetchLatestProfile();
    });

    _socketService.on('security:alert', (data) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.warning_amber_rounded, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        data['title'] ?? 'Security Alert',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(data['message'] ?? ''),
                    ],
                  ),
                ),
              ],
            ),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Colors.red.shade900,
            duration: const Duration(seconds: 10),
            action: SnackBarAction(
              label: 'DISMISS',
              textColor: Colors.white,
              onPressed: () {},
            ),
          ),
        );
      }
    });

    _socketService.on('notification:new', (data) {
      if (mounted) {
        Provider.of<NotificationProvider>(context, listen: false).fetchNotifications();
      }
    });

    // When admin updates this guard's shift, the backend pushes fresh user data.
    // We merge it into AuthProvider and re-fetch the active shift so the UI
    // reflects the new schedule immediately — no logout/re-login required.
    _socketService.on('user:shiftUpdated', (data) {
      if (!mounted) return;
      final updatedFields = {
        if (data['assignedShift'] != null) 'assignedShift': data['assignedShift'],
        if (data['shiftStartTime'] != null) 'shiftStartTime': data['shiftStartTime'],
        if (data['shiftEndTime'] != null) 'shiftEndTime': data['shiftEndTime'],
      };
      Provider.of<AuthProvider>(context, listen: false)
          .updateUserLocally(updatedFields);
      Provider.of<ShiftProvider>(context, listen: false).fetchActiveShift();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              Icon(Icons.update_rounded, color: Colors.white),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Your shift schedule has been updated by admin.',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          backgroundColor: Color(0xFF1B3A6B),
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 5),
        ),
      );
    });
  }

  @override
  void dispose() {
    _drawerAnimController.dispose();
    _socketService.off('security:alert');
    _socketService.off('notification:new');
    _socketService.off('user:shiftUpdated');
    super.dispose();
  }

  void _openDrawer() {
    _scaffoldKey.currentState?.openDrawer();
    _drawerAnimController.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    return AppLifecycleObserver(
      onResume: () {
        if (!mounted) return;
        Provider.of<ShiftProvider>(context, listen: false).fetchActiveShift();
        Provider.of<NotificationProvider>(context, listen: false).fetchNotifications();
        // Re-fetch latest profile so admin-updated shift times are applied immediately
        Provider.of<AuthProvider>(context, listen: false).fetchLatestProfile();
      },
      child: Scaffold(
        key: _scaffoldKey,
        backgroundColor: AppConstants.backgroundColor,
        drawer: _SecurityDrawer(
          animController: _drawerAnimController,
          onNav: _nav,
        ),
        body: SecurityDashboard(
          openDrawer: _openDrawer,
        ),
      ),
    );
  }

  void _nav(Widget screen) {
    Navigator.pop(context); // close drawer
    Navigator.push(context, _slideRoute(screen));
  }

  Route _slideRoute(Widget screen) {
    return PageRouteBuilder(
      pageBuilder: (_, __, ___) => screen,
      transitionsBuilder: (_, animation, __, child) {
        final tween =
            Tween(begin: const Offset(1.0, 0.0), end: Offset.zero)
                .chain(CurveTween(curve: Curves.easeOutCubic));
        return SlideTransition(position: animation.drive(tween), child: child);
      },
      transitionDuration: const Duration(milliseconds: 380),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dedicated animated Drawer widget
// ─────────────────────────────────────────────────────────────────────────────
class _SecurityDrawer extends StatefulWidget {
  final AnimationController animController;
  final void Function(Widget) onNav;

  const _SecurityDrawer({
    required this.animController,
    required this.onNav,
  });

  @override
  State<_SecurityDrawer> createState() => _SecurityDrawerState();
}

class _SecurityDrawerState extends State<_SecurityDrawer>
    with SingleTickerProviderStateMixin {
  late AnimationController _localCtrl;



  @override
  void initState() {
    super.initState();
    _localCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    )..forward();
  }

  @override
  void dispose() {
    _localCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final shiftProvider = Provider.of<ShiftProvider>(context);
    final hasActiveShift = shiftProvider.hasActiveShift;

    final fullName = user?['fullName'] ?? 'Security Officer';
    final email = user?['email'] ?? 'security@campus.com';
    final initials = fullName.isNotEmpty
        ? fullName.trim().split(' ').map((e) => e[0]).take(2).join()
        : 'SO';

    void requireShift(VoidCallback action) {
      action();
    }

    final menuSections = [
      _MenuSection(title: 'Operations', items: [
        _MenuItem(Icons.qr_code_scanner_rounded, 'QR Scanner',
            const Color(0xFF1565C0), () => requireShift(() => widget.onNav(const ScannerScreen()))),
        _MenuItem(Icons.assignment_rounded, 'Access Logs',
            const Color(0xFF00695C), () => requireShift(() => widget.onNav(const AccessLogsScreen()))),
        _MenuItem(Icons.person_add_rounded, 'Visitors',
            const Color(0xFF6A1B9A), () => requireShift(() => widget.onNav(const VisitorsScreen()))),
        _MenuItem(Icons.report_problem_rounded, 'Incidents',
            const Color(0xFFC62828), () => requireShift(() => widget.onNav(const IncidentsScreen()))),
      ]),
      _MenuSection(title: 'Management', items: [
        _MenuItem(Icons.gavel_rounded, 'Blacklist',
            const Color(0xFF4E342E), () => requireShift(() => widget.onNav(const BlacklistScreen()))),
        _MenuItem(Icons.analytics_rounded, 'Reports',
            const Color(0xFFF57C00), () => requireShift(() => widget.onNav(const SecurityReportsScreen()))),
      ]),
      _MenuSection(title: 'Account', items: [
        _MenuItem(Icons.person_pin_rounded, 'My Profile',
            const Color(0xFF0277BD), () => widget.onNav(const SecurityProfileTab())),
      ]),
    ];

    return SizedBox(
      width: MediaQuery.of(context).size.width * 0.82,
      child: Drawer(
        elevation: 0,
        backgroundColor: Colors.transparent,
        child: Container(
          decoration: const BoxDecoration(
            color: Color(0xFFF8F9FC),
            borderRadius: BorderRadius.only(
              topRight: Radius.circular(32),
              bottomRight: Radius.circular(32),
            ),
          ),
          child: ClipRRect(
            borderRadius: const BorderRadius.only(
              topRight: Radius.circular(32),
              bottomRight: Radius.circular(32),
            ),
            child: Column(
              children: [
                // ── Animated Header ──────────────────────────
                _AnimatedHeader(
                  ctrl: _localCtrl,
                  fullName: fullName,
                  email: email,
                  initials: initials,
                  hasActiveShift: hasActiveShift,
                ),

                // ── Menu Items ───────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    children: [
                      for (int s = 0; s < menuSections.length; s++) ...[
                        _AnimatedSectionLabel(
                          ctrl: _localCtrl,
                          label: menuSections[s].title,
                          delay: 0.1 + s * 0.08,
                        ),
                        for (int i = 0; i < menuSections[s].items.length; i++)
                          _AnimatedDrawerTile(
                            ctrl: _localCtrl,
                            item: menuSections[s].items[i],
                            delay: 0.15 + s * 0.08 + i * 0.06,
                          ),
                        const SizedBox(height: 4),
                      ],
                    ],
                  ),
                ),

                // ── Logout ───────────────────────────────────
                _AnimatedLogout(
                  ctrl: _localCtrl,
                  hasActiveShift: false,
                  onTap: () async {
                    await auth.logout();
                    if (context.mounted) {
                      Navigator.of(context)
                          .pushNamedAndRemoveUntil('/login', (r) => false);
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Header
// ─────────────────────────────────────────────────────────────────────────────
class _AnimatedHeader extends StatelessWidget {
  final AnimationController ctrl;
  final String fullName;
  final String email;
  final String initials;
  final bool hasActiveShift;

  const _AnimatedHeader({
    required this.ctrl,
    required this.fullName,
    required this.email,
    required this.initials,
    required this.hasActiveShift,
  });

  @override
  Widget build(BuildContext context) {
    final fadeSlide = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
          parent: ctrl,
          curve: const Interval(0.0, 0.5, curve: Curves.easeOut)),
    );

    return FadeTransition(
      opacity: fadeSlide,
      child: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0A1628), Color(0xFF0D3B8E), Color(0xFF1565C0)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.only(topRight: Radius.circular(32)),
        ),
        child: Stack(
          children: [
            // Decorative circles
            Positioned(
              right: -40,
              top: -40,
              child: Container(
                width: 160,
                height: 160,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.05),
                ),
              ),
            ),
            Positioned(
              right: 20,
              bottom: -20,
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.07),
                ),
              ),
            ),
            Positioned(
              left: -20,
              top: 40,
              child: Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.04),
                ),
              ),
            ),

            // Content
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 56, 24, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Avatar with glow ring
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [Color(0xFF1A1A1A), Color(0xFF424242)],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF1A1A1A).withValues(alpha: 0.4),
                          blurRadius: 16,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: CircleAvatar(
                      radius: 36,
                      backgroundColor: const Color(0xFF0D47A1),
                      child: Text(
                        initials.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  Text(
                    fullName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    email,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.65),
                      fontSize: 12.5,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: 16),

                  // Shift status badge
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 400),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: hasActiveShift
                          ? const Color(0xFF2E7D32).withValues(alpha: 0.85)
                          : Colors.white.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: hasActiveShift
                            ? const Color(0xFF66BB6A)
                            : Colors.white24,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: hasActiveShift
                                ? const Color(0xFF69F0AE)
                                : Colors.white38,
                            shape: BoxShape.circle,
                            boxShadow: hasActiveShift
                                ? [
                                    BoxShadow(
                                      color: const Color(0xFF69F0AE)
                                          .withValues(alpha: 0.7),
                                      blurRadius: 6,
                                    )
                                  ]
                                : [],
                          ),
                        ),
                        const SizedBox(width: 7),
                        Text(
                          hasActiveShift ? 'ON DUTY' : 'OFF DUTY',
                          style: TextStyle(
                            color: hasActiveShift
                                ? const Color(0xFFB9F6CA)
                                : Colors.white54,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated section label
// ─────────────────────────────────────────────────────────────────────────────
class _AnimatedSectionLabel extends StatelessWidget {
  final AnimationController ctrl;
  final String label;
  final double delay;

  const _AnimatedSectionLabel({
    required this.ctrl,
    required this.label,
    required this.delay,
  });

  @override
  Widget build(BuildContext context) {
    final anim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: ctrl,
        curve: Interval(delay.clamp(0.0, 1.0),
            (delay + 0.2).clamp(0.0, 1.0),
            curve: Curves.easeOut),
      ),
    );
    return FadeTransition(
      opacity: anim,
      child: Padding(
        padding:
            const EdgeInsets.only(left: 8, top: 16, bottom: 6),
        child: Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            color: Colors.grey.shade500,
            letterSpacing: 1.4,
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Drawer Tile
// ─────────────────────────────────────────────────────────────────────────────
class _AnimatedDrawerTile extends StatefulWidget {
  final AnimationController ctrl;
  final _MenuItem item;
  final double delay;

  const _AnimatedDrawerTile({
    required this.ctrl,
    required this.item,
    required this.delay,
  });

  @override
  State<_AnimatedDrawerTile> createState() => _AnimatedDrawerTileState();
}

class _AnimatedDrawerTileState extends State<_AnimatedDrawerTile> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final slideAnim = Tween<Offset>(
      begin: const Offset(-0.3, 0),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: widget.ctrl,
        curve: Interval(
          widget.delay.clamp(0.0, 1.0),
          (widget.delay + 0.25).clamp(0.0, 1.0),
          curve: Curves.easeOutCubic,
        ),
      ),
    );
    final fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: widget.ctrl,
        curve: Interval(
          widget.delay.clamp(0.0, 1.0),
          (widget.delay + 0.25).clamp(0.0, 1.0),
          curve: Curves.easeOut,
        ),
      ),
    );

    return FadeTransition(
      opacity: fadeAnim,
      child: SlideTransition(
        position: slideAnim,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: GestureDetector(
            onTapDown: (_) => setState(() => _hovered = true),
            onTapUp: (_) {
              setState(() => _hovered = false);
              widget.item.onTap();
            },
            onTapCancel: () => setState(() => _hovered = false),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOut,
              decoration: BoxDecoration(
                color: _hovered
                    ? widget.item.color.withValues(alpha: 0.08)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(14),
              ),
              padding: const EdgeInsets.symmetric(
                  horizontal: 12, vertical: 12),
              child: Row(
                children: [
                  // Color-coded icon container
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: _hovered
                          ? widget.item.color
                          : widget.item.color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      widget.item.icon,
                      size: 20,
                      color: _hovered
                          ? Colors.white
                          : widget.item.color,
                    ),
                  ),
                  const SizedBox(width: 14),

                  // Title
                  Expanded(
                    child: Text(
                      widget.item.label,
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w600,
                        color: _hovered
                            ? widget.item.color
                            : const Color(0xFF1A1A2E),
                      ),
                    ),
                  ),

                  // Arrow
                  AnimatedOpacity(
                    duration: const Duration(milliseconds: 180),
                    opacity: _hovered ? 1 : 0.3,
                    child: Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 13,
                      color: widget.item.color,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Logout Button
// ─────────────────────────────────────────────────────────────────────────────
class _AnimatedLogout extends StatefulWidget {
  final AnimationController ctrl;
  final bool hasActiveShift;
  final VoidCallback onTap;

  const _AnimatedLogout({
    required this.ctrl,
    required this.hasActiveShift,
    required this.onTap,
  });

  @override
  State<_AnimatedLogout> createState() => _AnimatedLogoutState();
}

class _AnimatedLogoutState extends State<_AnimatedLogout> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final anim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: widget.ctrl,
        curve: const Interval(0.7, 1.0, curve: Curves.easeOut),
      ),
    );
    return FadeTransition(
      opacity: anim,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        child: Column(
          children: [
            const Divider(height: 1, color: Color(0xFFEEEEF4)),
            const SizedBox(height: 16),
            GestureDetector(
              onTapDown: (_) => setState(() => _pressed = true),
              onTapUp: (_) {
                setState(() => _pressed = false);
                widget.onTap();
              },
              onTapCancel: () => setState(() => _pressed = false),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(
                    vertical: 14, horizontal: 20),
                decoration: BoxDecoration(
                  color: _pressed
                      ? const Color(0xFFB71C1C).withValues(alpha: 0.1)
                      : const Color(0xFFFFF5F5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _pressed
                        ? const Color(0xFFEF5350)
                        : const Color(0xFFFFCDD2),
                    width: 1.2,
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.logout_rounded,
                        color: Color(0xFFD32F2F), size: 20),
                    SizedBox(width: 10),
                    Text(
                      'Sign Out',
                      style: TextStyle(
                        color: Color(0xFFD32F2F),
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        letterSpacing: 0.3,
                      ),
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Data models
// ─────────────────────────────────────────────────────────────────────────────
class _MenuSection {
  final String title;
  final List<_MenuItem> items;
  const _MenuSection({required this.title, required this.items});
}

class _MenuItem {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _MenuItem(this.icon, this.label, this.color, this.onTap);
}
