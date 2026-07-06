import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import '../../providers/shift_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/socket_service.dart';

class ShiftScreen extends StatefulWidget {
  const ShiftScreen({super.key});
  @override
  State<ShiftScreen> createState() => _ShiftScreenState();
}

class _ShiftScreenState extends State<ShiftScreen> {
  final ApiService _api = ApiService();
  List<dynamic> _history = [];
  bool _loadingHistory = true;
  bool _use12h = false; // toggle: false = 24h, true = 12h AM/PM

  final SocketService _socketService = SocketService();

  @override
  void initState() {
    super.initState();
    _refresh();
    _socketService.on('user:shiftUpdated', (_) {
      if (mounted) _refresh();
    });
  }

  @override
  void dispose() {
    _socketService.off('user:shiftUpdated');
    super.dispose();
  }

  Future<void> _refresh() async {
    final shiftProvider = Provider.of<ShiftProvider>(context, listen: false);
    setState(() => _loadingHistory = true);
    try {
      await shiftProvider.fetchActiveShift();
      final historyRes = await _api.get('/security/shifts');
      if (mounted) {
        setState(() {
          _history = historyRes.data;
          _loadingHistory = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingHistory = false);
    }
  }

  Future<void> _startShift() async {
    final shiftProvider = Provider.of<ShiftProvider>(context, listen: false);
    final success = await shiftProvider.startShift();
    if (success) {
      _refresh();
    }
    // Error message is now read from shiftProvider.startShiftError and shown in UI
  }

  void _endShiftDialog() {
    final shiftProvider = Provider.of<ShiftProvider>(context, listen: false);
    final notesCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('End Shift'),
        content: TextField(
          controller: notesCtrl,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Any shift notes or observations?',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(ctx);
              final success =
                  await shiftProvider.endShift(notes: notesCtrl.text.trim());
              if (success) {
                _refresh();
              }
            },
            child:
                const Text('End Shift', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  String _duration(String start, String? end) {
    final s = DateTime.parse(start).toLocal();
    final e = end != null ? DateTime.parse(end).toLocal() : DateTime.now();
    final diff = e.difference(s);
    final h = diff.inHours;
    final m = diff.inMinutes.remainder(60);
    return '${h}h ${m}m';
  }

  bool _isWithinShiftWindow(Map<String, dynamic>? user) {
    if (user == null) return false;

    final role = (user['role'] as String?)?.toLowerCase();
    if (role == 'admin' || role == 'superadmin' || role == 'staff') {
      return true;
    }

    final now = DateTime.now();
    final nowMins = now.hour * 60 + now.minute;

    final startStr = user['shiftStartTime'] as String? ?? '';
    final endStr = user['shiftEndTime'] as String? ?? '';

    if (startStr.isNotEmpty && endStr.isNotEmpty) {
      try {
        final sParts = startStr.split(':').map(int.parse).toList();
        final eParts = endStr.split(':').map(int.parse).toList();
        final startMins = sParts[0] * 60 + sParts[1];
        final endMins = eParts[0] * 60 + eParts[1];

        if (startMins <= endMins) {
          return nowMins >= startMins && nowMins <= endMins;
        } else {
          return nowMins >= startMins || nowMins <= endMins;
        }
      } catch (_) {}
    }

    final assignedShift =
        (user['assignedShift'] as String? ?? 'none').toLowerCase();
    if (assignedShift == 'morning') {
      return nowMins >= (5 * 60) && nowMins <= (13 * 60 + 29); // 05:00 - 13:29
    } else if (assignedShift == 'afternoon') {
      return nowMins >= (13 * 60 + 30) && nowMins <= (18 * 60); // 13:30 - 18:00
    }

    return false;
  }

  String _getShiftWindowMessage(Map<String, dynamic>? user) {
    if (user == null) return 'No user details found.';

    final startStr = user['shiftStartTime'] as String? ?? '';
    final endStr = user['shiftEndTime'] as String? ?? '';

    if (startStr.isNotEmpty && endStr.isNotEmpty) {
      return 'Your shift will start at ${_fmtTimeStr(startStr)} and end at ${_fmtTimeStr(endStr)}.';
    }

    final assignedShift =
        (user['assignedShift'] as String? ?? 'none').toLowerCase();
    if (assignedShift == 'morning') {
      return 'Your shift runs from ${_fmtTimeStr('05:00')} to ${_fmtTimeStr('13:29')} (Morning).';
    } else if (assignedShift == 'afternoon') {
      return 'Your shift runs from ${_fmtTimeStr('13:30')} to ${_fmtTimeStr('18:00')} (Afternoon).';
    }

    return 'No active shift is assigned to you today.';
  }

  /// Format a DateTime to HH:mm or hh:mm a based on toggle
  String _fmt(DateTime dt) {
    return _use12h
        ? DateFormat('hh:mm a').format(dt)
        : DateFormat('HH:mm').format(dt);
  }

  /// Format a "HH:mm" string to 12h or 24h based on toggle
  String _fmtTimeStr(String timeStr) {
    if (timeStr.isEmpty) return timeStr;
    try {
      final parts = timeStr.split(':').map(int.parse).toList();
      final dt = DateTime(2000, 1, 1, parts[0], parts[1]);
      return _use12h ? DateFormat('hh:mm a').format(dt) : timeStr;
    } catch (_) {
      return timeStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    final shiftProvider = Provider.of<ShiftProvider>(context);
    final activeShift = shiftProvider.activeShift;
    final startError = shiftProvider.startShiftError;
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;
    final isWithinWindow = _isWithinShiftWindow(user);

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Shift Management'),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          // ── 12h / 24h toggle ─────────────────────────────────────
          GestureDetector(
            onTap: () => setState(() => _use12h = !_use12h),
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: _use12h ? const Color(0xFF1B3A6B) : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _use12h ? const Color(0xFF1B3A6B) : Colors.grey.shade300,
                ),
              ),
              child: Text(
                _use12h ? 'AM/PM' : '24H',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  color: _use12h ? Colors.white : Colors.grey.shade700,
                ),
              ),
            ),
          ),
          IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _loadingHistory
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Active shift card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: activeShift != null
                              ? [
                                  const Color(0xFF1E8E3E),
                                  const Color(0xFF00695C)
                                ]
                              : [
                                  const Color(0xFF5F6368),
                                  const Color(0xFF3C4043)
                                ],
                        ),
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                              color: (activeShift != null
                                      ? Colors.green
                                      : Colors.grey)
                                  .withValues(alpha: 0.3),
                              blurRadius: 16,
                              offset: const Offset(0, 8)),
                        ],
                      ),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(children: [
                              Icon(
                                activeShift != null
                                    ? Icons.work
                                    : Icons.work_off,
                                color: Colors.white,
                                size: 28,
                              ),
                              const SizedBox(width: 12),
                              Text(
                                activeShift != null
                                    ? 'SHIFT ACTIVE'
                                    : 'OFF DUTY',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 18),
                              ),
                            ]),
                            const SizedBox(height: 16),
                            if (activeShift != null) ...[
                              Text(
                                'Started: ${_fmt(DateTime.parse(activeShift['shiftStart']).toLocal())}',
                                style: const TextStyle(
                                    color: Colors.white70, fontSize: 13),
                              ),
                              Text(
                                'Duration: ${_duration(activeShift['shiftStart'], null)}',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              Row(children: [
                                _stat(
                                    'Scans',
                                    activeShift['scansCount']?.toString() ??
                                        '0'),
                                const SizedBox(width: 20),
                                _stat(
                                    'Incidents',
                                    activeShift['incidentsCount']?.toString() ??
                                        '0'),
                              ]),
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: Colors.red,
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 14),
                                    shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(14)),
                                  ),
                                  onPressed: _endShiftDialog,
                                  child: const Text('END SHIFT',
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16)),
                                ),
                              ),
                            ] else ...[
                              const Text(
                                  'You are not on duty. Start a shift to begin monitoring.',
                                  style: TextStyle(color: Colors.white70)),
                              const SizedBox(height: 16),
                              // ── Info banner (shown when not within shift window) ──────
                              if (!isWithinWindow) ...[
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: Colors.amber.shade900
                                        .withValues(alpha: 0.8),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Icon(Icons.info_outline,
                                          color: Colors.white, size: 18),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          '${_getShiftWindowMessage(user)}\nyou dont have access so please wait your shift.',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 13,
                                            fontWeight: FontWeight.w500,
                                            height: 1.4,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),
                              ],
                              // ── Error banner (shown when startShift is rejected) ──────
                              if (startError != null) ...[
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFB71C1C),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Icon(
                                          Icons.access_time_filled_rounded,
                                          color: Colors.white,
                                          size: 18),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          startError,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 13,
                                            fontWeight: FontWeight.w500,
                                            height: 1.4,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),
                              ],
                              // ─────────────────────────────────────────────────────────
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: Colors.green.shade800,
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 14),
                                    shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(14)),
                                  ),
                                  onPressed: (shiftProvider.isLoading ||
                                          !isWithinWindow)
                                      ? null
                                      : _startShift,
                                  child: shiftProvider.isLoading
                                      ? const SizedBox(
                                          height: 20,
                                          width: 20,
                                          child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: Colors.green),
                                        )
                                      : const Text('START SHIFT',
                                          style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 16)),
                                ),
                              ),
                            ],
                          ]),
                    ),

                    const SizedBox(height: 28),
                    const Text('Shift History',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 18)),
                    const SizedBox(height: 12),
                    if (_history.isEmpty)
                      Center(
                          child: Text('No shifts recorded yet',
                              style: TextStyle(color: Colors.grey.shade400)))
                    else
                      ..._history.map((sh) {
                        final isActive = sh['status'] == 'active';
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: isActive
                                      ? Colors.green.withValues(alpha: 0.1)
                                      : Colors.grey.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                    isActive
                                        ? Icons.run_circle
                                        : Icons.check_circle_outline,
                                    color:
                                        isActive ? Colors.green : Colors.grey),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                  child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                    Text(
                                      DateFormat('MMM dd, yyyy').format(
                                          DateTime.parse(sh['shiftStart'])
                                              .toLocal()),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold),
                                    ),
                                    Text(
                                      '${_fmt(DateTime.parse(sh['shiftStart']).toLocal())} - '
                                      '${sh['shiftEnd'] != null ? _fmt(DateTime.parse(sh['shiftEnd']).toLocal()) : 'Ongoing'}',
                                      style: const TextStyle(
                                          fontSize: 12, color: Colors.grey),
                                    ),
                                  ])),
                              Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      _duration(
                                          sh['shiftStart'], sh['shiftEnd']),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold),
                                    ),
                                    Text('${sh['scansCount'] ?? 0} scans',
                                        style: const TextStyle(
                                            fontSize: 11, color: Colors.grey)),
                                  ]),
                            ]),
                          ),
                        );
                      }),
                  ]),
            ),
    );
  }

  Widget _stat(String label, String val) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(val,
            style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 22)),
        Text(label,
            style: const TextStyle(color: Colors.white60, fontSize: 12)),
      ]);
}
