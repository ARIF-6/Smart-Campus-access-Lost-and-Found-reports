import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:dio/dio.dart';
import 'package:provider/provider.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import '../../providers/auth_provider.dart';

enum _ScanState { idle, loading, scanned }

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> with SingleTickerProviderStateMixin {
  late MobileScannerController _cameraController;
  _ScanState _scanState = _ScanState.idle;
  bool _cameraActive = false;
  String _lastMethod = 'QR';
  late AnimationController _pulseController;
  late Animation<double> _pulseAnim;

  final ApiService _apiService = ApiService();
  Map<String, dynamic>? _scanResult;

  @override
  void initState() {
    super.initState();
    _cameraController = MobileScannerController(autoStart: false);
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 1.0, end: 1.06).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _cameraController.stop();
    _cameraController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  String _extractQrValue(String rawValue) {
    final value = rawValue.trim();
    if (value.isEmpty) return value;

    try {
      final decoded = jsonDecode(value);
      if (decoded is Map<String, dynamic>) {
        return (decoded['qrCode'] ??
                decoded['qrData'] ??
                decoded['studentId'] ??
                decoded['userId'] ??
                value)
            .toString()
            .trim();
      }
    } catch (_) {
      // Most QR codes in this app are plain strings, so JSON parsing is optional.
    }

    // If the QR is a URL with query params like ?studentId= or ?qr=, prefer that
    try {
      final uri = Uri.tryParse(value);
      if (uri != null) {
        if (uri.queryParameters.isNotEmpty) {
          final qp = uri.queryParameters;
          if (qp['studentId'] != null && qp['studentId']!.isNotEmpty) return qp['studentId']!.trim();
          if (qp['student_id'] != null && qp['student_id']!.isNotEmpty) return qp['student_id']!.trim();
          if (qp['qr'] != null && qp['qr']!.isNotEmpty) return qp['qr']!.trim();
          if (qp['qrCode'] != null && qp['qrCode']!.isNotEmpty) return qp['qrCode']!.trim();
        }

        // Otherwise, if it's a URL path, take the last segment
        final segments = uri.pathSegments;
        if (segments.isNotEmpty) {
          final last = segments.last.trim();
          if (last.isNotEmpty) return last;
        }
      }
    } catch (_) {}

    // Fallback to raw value
    return value;
  }

  void _showShiftBlockedBottomSheet(Map<String, dynamic>? user) {
    if (mounted) {
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
    }
  }

  Future<void> _verifyAccess(String identifier, String method, {String? status}) async {
    if (_scanState == _ScanState.loading) return;
    final cleanIdentifier = identifier.trim();
    if (cleanIdentifier.isEmpty) return;

    final user = Provider.of<AuthProvider>(context, listen: false).user;
    if (!_isWithinShiftWindow(user)) {
      _showShiftBlockedBottomSheet(user);
      return;
    }
    _lastMethod = method;
    setState(() => _scanState = _ScanState.loading);
    try {
      final payload = <String, dynamic>{
        'method': method,
      };
      if (method == 'QR') {
        // Send multiple possible identifiers to increase matching tolerance
        payload['qrCode'] = cleanIdentifier;
        payload['qrData'] = cleanIdentifier;
        payload['studentId'] = cleanIdentifier.toString().toUpperCase();
      } else {
        payload['studentId'] = cleanIdentifier.toString().toUpperCase();
        if (status != null) payload['status'] = status;
      }

      final response = await _apiService.post('/access/scan', data: {
        ...payload,
      });
      if (mounted) {
        setState(() {
          _scanResult = response.data;
          _scanState = _ScanState.scanned;
          _cameraActive = false;
          try {
            _cameraController.stop();
          } catch (_) {}
        });
      }
    } on DioException catch (e) {
      if (mounted) {
        // Extract structured error body (403 blacklist, 404 not found, etc.)
        final errorData = e.response?.data;
        if (errorData is Map<String, dynamic>) {
          setState(() {
            _scanResult = errorData;
            _scanState = _ScanState.scanned;
            _cameraActive = false;
            try {
              _cameraController.stop();
            } catch (_) {}
          });
        } else {
          setState(() {
            _scanResult = {
              'status': 'Connection Error',
              'color': 'red',
              'message': 'Cannot reach server. Check your connection.',
            };
            _scanState = _ScanState.scanned;
            _cameraActive = false;
            try {
              _cameraController.stop();
            } catch (_) {}
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _scanResult = {
            'status': 'Error',
            'color': 'red',
            'message': 'Unexpected error. Try again.',
          };
          _scanState = _ScanState.scanned;
          _cameraActive = false;
          try {
            _cameraController.stop();
          } catch (_) {}
        });
      }
    }
  }

  void _onDetect(BarcodeCapture capture) {
    if (_scanState != _ScanState.idle) return;
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isNotEmpty && barcodes.first.rawValue != null) {
      final raw = barcodes.first.rawValue!;
      final qrValue = _extractQrValue(raw);
      _verifyAccess(qrValue, 'QR');
    }
  }

  void _showManualEntryDialog() {
    final TextEditingController idController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Manual Access Control'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Enter Student ID to record entry or exit manually.'),
              const SizedBox(height: 16),
              TextField(
                controller: idController,
                decoration: const InputDecoration(
                  hintText: 'e.g. STU-2024-001',
                  labelText: 'Student ID',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.badge_outlined),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('CANCEL'),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppConstants.statusValid),
                    onPressed: () {
                      if (idController.text.trim().isEmpty) return;
                      Navigator.pop(ctx);
                      _verifyAccess(idController.text.trim(), 'Manual', status: 'IN');
                    },
                    child: const Text('ENTRY', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
                    onPressed: () {
                      if (idController.text.trim().isEmpty) return;
                      Navigator.pop(ctx);
                      _verifyAccess(idController.text.trim(), 'Manual', status: 'OUT');
                    },
                    child: const Text('EXIT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }

  Future<void> _startScan() async {
    setState(() {
      _cameraActive = true;
      _scanState = _ScanState.idle;
    });
    try {
      await _cameraController.start();
    } catch (_) {}
  }

  Future<void> _stopScan() async {
    setState(() {
      _cameraActive = false;
      _scanState = _ScanState.idle;
    });
    try {
      await _cameraController.stop();
    } catch (_) {}
  }

  /// Returns true if the current time is within the guard's assigned shift window.
  /// Mirrors the identical helper in ShiftScreen so both screens are consistent.
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
          // Overnight window (e.g. 22:00 – 06:00)
          return nowMins >= startMins || nowMins <= endMins;
        }
      } catch (_) {}
    }

    final assignedShift = (user['assignedShift'] as String? ?? 'none').toLowerCase();
    if (assignedShift == 'morning') {
      return nowMins >= (5 * 60) && nowMins <= (13 * 60 + 29);
    } else if (assignedShift == 'afternoon') {
      return nowMins >= (13 * 60 + 30) && nowMins <= (18 * 60);
    }

    return false;
  }

  /// Returns a human-readable message describing the guard's assigned shift window.
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
    return 'No active shift is assigned to you. Contact an administrator.';
  }

  @override
  Widget build(BuildContext context) {
    // Wrap in Consumer<AuthProvider> so the screen rebuilds instantly when
    // the admin pushes a shift update via the real-time socket event.
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        final user = auth.user;
        final withinWindow = _isWithinShiftWindow(user);

        return Scaffold(
          backgroundColor: AppConstants.backgroundColor,
          appBar: AppBar(
            title: const Text('Access Control'),
            backgroundColor: Colors.white,
            elevation: 0,
          ),
          body: Stack(
            children: [
              _cameraActive ? _buildCameraView() : _buildHomeView(),
              if (_scanState != _ScanState.idle)
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: _buildResultSheet(),
                ),
            ],
          ),
        );
      },
    );
  }

  /// Shown when the current time is outside the guard's assigned shift window.
  Widget _buildShiftBlockedView(Map<String, dynamic>? user) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.access_time_filled_rounded,
                size: 72,
                color: Colors.orange.shade700,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Access Control Locked',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0D1B38),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              _getShiftWindowMessage(user),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5),
            ),
            const SizedBox(height: 8),
            Text(
              'Student Entry and Exit operations are only allowed during your assigned shift window.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade500, height: 1.4),
            ),
            const SizedBox(height: 28),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.orange.shade100,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange.shade300),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.info_outline, color: Colors.orange.shade800, size: 18),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'This screen will unlock automatically when your shift begins.',
                      style: TextStyle(fontSize: 12, color: Colors.orange.shade800, fontWeight: FontWeight.w500),
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

  Widget _buildHomeView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 48),
          ScaleTransition(
            scale: _pulseAnim,
            child: GestureDetector(
              onTap: () {
                final user = Provider.of<AuthProvider>(context, listen: false).user;
                if (!_isWithinShiftWindow(user)) {
                  _showShiftBlockedBottomSheet(user);
                } else {
                  _startScan();
                }
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(48),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppConstants.primaryColor, Color(0xFF1D4ED8)],
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppConstants.primaryColor.withValues(alpha: 0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: const Column(
                  children: [
                    Icon(Icons.qr_code_scanner, size: 80, color: Colors.white),
                    SizedBox(height: 16),
                    Text(
                      'START SCAN',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () {
              final user = Provider.of<AuthProvider>(context, listen: false).user;
              if (!_isWithinShiftWindow(user)) {
                _showShiftBlockedBottomSheet(user);
              } else {
                _showManualEntryDialog();
              }
            },
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 54),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: const Icon(Icons.edit),
            label: const Text('MANUAL ENTRY'),
          ),
        ],
      ),
    );
  }

  Widget _buildCameraView() {
    return Stack(
      children: [
        MobileScanner(
          controller: _cameraController,
          errorBuilder: (BuildContext context, MobileScannerException error) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error, color: Colors.white, size: 40),
                  SizedBox(height: 16),
                  Text('Camera access is needed to scan QR codes.\nPlease allow camera permissions.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 14, height: 1.5)),
                ],
              ),
            );
          },
          onDetect: _onDetect,
        ),
        Center(
          child: Container(
            width: 250,
            height: 250,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 2),
              borderRadius: BorderRadius.circular(24),
            ),
          ),
        ),
        Positioned(
          top: 40,
          left: 20,
          child: IconButton(
            icon: const Icon(Icons.close, color: Colors.white, size: 32),
            onPressed: _stopScan,
          ),
        ),
      ],
    );
  }

  Widget _buildResultSheet() {
    if (_scanState == _ScanState.loading) {
      return Container(
        height: 200,
        color: Colors.white,
        child: const Center(child: CircularProgressIndicator()),
      );
    }
    
    final res = _scanResult ?? {};
    final student = res['student'];
    final isBlacklisted = res['status'] == 'BLACKLISTED';

    // ── Special blacklist alert ───────────────────────────
    if (isBlacklisted) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.red.shade900,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 20)],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.gpp_bad, color: Colors.white, size: 64),
            const SizedBox(height: 12),
            const Text('⚠️ BLACKLISTED INDIVIDUAL',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (student != null) ...[
              Text(student['name'] ?? '',
                style: const TextStyle(color: Colors.white70, fontSize: 18, fontWeight: FontWeight.w600)),
              if ((student['studentId'] ?? '').isNotEmpty)
                Text('ID: ${student['studentId']}', style: const TextStyle(color: Colors.white60, fontSize: 14)),
            ],
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                res['blacklist'] != null
                  ? 'Reason: ${res['blacklist']['reason'] ?? ''}'
                  : res['message'] ?? '',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500),
              ),
            ),
            const SizedBox(height: 16),
            const Text('DO NOT ALLOW ENTRY. Contact supervisor immediately.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 13)),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.red.shade900,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  setState(() => _scanState = _ScanState.idle);
                  if (_lastMethod == 'QR') {
                    _startScan();
                  }
                },
                child: const Text('SCAN NEXT', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      );
    }
    // ───────────────────────────────────────────────────────

    final statusColor = res['color'] == 'green' ? AppConstants.statusValid : (res['color'] == 'yellow' ? Colors.orange : AppConstants.statusInvalid);
    
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20)],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(
                res['color'] == 'green' ? Icons.check_circle : (res['color'] == 'yellow' ? Icons.logout : Icons.error),
                color: statusColor,
                size: 32,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  res['status'] ?? 'Error',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: statusColor),
                ),
              ),
              IconButton(
                onPressed: () => setState(() => _scanState = _ScanState.idle),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const Divider(height: 32),
          
          if (student != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.withValues(alpha: 0.1)),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: AppConstants.primaryColor.withValues(alpha: 0.1),
                    backgroundImage: student['photoUrl'] != null && student['photoUrl'].toString().isNotEmpty
                        ? NetworkImage(AppConstants.getImageUrl(student['photoUrl'].toString()))
                        : null,
                    child: student['photoUrl'] == null || student['photoUrl'].toString().isEmpty
                        ? const Icon(Icons.person, size: 40, color: AppConstants.primaryColor)
                        : null,
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          student['name'] ?? 'Unknown Student',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'ID: ${student['studentId'] ?? 'N/A'}',
                          style: TextStyle(color: Colors.grey[600], fontWeight: FontWeight.w500),
                        ),
                        if (student['major'] != null && student['major'].toString().isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              student['major'],
                              style: TextStyle(color: Colors.grey[500], fontSize: 13),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          
          const SizedBox(height: 16),
          Text(
            res['message'] ?? '',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                // Reset and, if the last action was a camera scan, restart camera
                setState(() => _scanState = _ScanState.idle);
                if (_lastMethod == 'QR') {
                  _startScan();
                }
              },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('READY FOR NEXT SCAN', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
