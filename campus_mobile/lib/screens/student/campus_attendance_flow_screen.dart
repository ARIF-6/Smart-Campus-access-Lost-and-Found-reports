import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:dio/dio.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';

enum _FlowStep { qrScan, idEntry, confirm, success }

class CampusAttendanceFlowScreen extends StatefulWidget {
  const CampusAttendanceFlowScreen({super.key});

  @override
  State<CampusAttendanceFlowScreen> createState() => _CampusAttendanceFlowScreenState();
}

class _CampusAttendanceFlowScreenState extends State<CampusAttendanceFlowScreen> {
  _FlowStep _currentStep = _FlowStep.qrScan;
  final MobileScannerController _scannerController = MobileScannerController(autoStart: true);
  final ApiService _apiService = ApiService();
  final TextEditingController _idController = TextEditingController();

  bool _isLoading = false;
  String? _errorMessage;

  // Scanned Campus details
  String? _campusId;
  String? _campusName;

  // Student verification details
  String? _studentUserId;
  String? _studentFullName;
  String? _studentPhotoUrl;
  String? _nextAction; // 'ENTER' or 'EXIT'

  @override
  void dispose() {
    _scannerController.dispose();
    _idController.dispose();
    super.dispose();
  }

  void _resetFlow() {
    setState(() {
      _currentStep = _FlowStep.qrScan;
      _errorMessage = null;
      _campusId = null;
      _campusName = null;
      _studentUserId = null;
      _studentFullName = null;
      _studentPhotoUrl = null;
      _nextAction = null;
      _idController.clear();
      _scannerController.start();
    });
  }

  // Step 2: Validate scanned QR code token
  Future<void> _handleQrDetected(String qrToken) async {
    if (_isLoading) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await _apiService.post('/campus-attendance/scan', data: {
        'qrToken': qrToken,
      });

      if (response.statusCode == 200 && response.data != null) {
        // ApiService interceptor already unwraps the {success, data} envelope,
        // so response.data IS the inner data object directly.
        final campusData = response.data is Map ? response.data : {};
        _scannerController.stop();
        setState(() {
          _campusId = campusData['campusId']?.toString();
          _campusName = campusData['campusName']?.toString();
          _currentStep = _FlowStep.idEntry;
        });
      }
    } catch (e) {
      String msg = 'Invalid or expired campus QR Code. Please scan the current campus QR Code.';
      if (e is DioException && e.response?.data != null) {
        msg = e.response?.data['message'] ?? msg;
      }
      if (!mounted) return;
      setState(() {
        _errorMessage = msg;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  // Step 3: Verify Student ID
  Future<void> _verifyStudentId() async {
    final inputId = _idController.text.trim();
    if (inputId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your Student ID.'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await _apiService.post('/campus-attendance/verify-id', data: {
        'studentId': inputId,
        'campusId': _campusId,
      });

      if (response.statusCode == 200 && response.data != null) {
        // ApiService interceptor already unwraps the {success, data} envelope.
        final studentData = response.data is Map ? response.data : {};
        setState(() {
          _studentUserId = studentData['userId']?.toString();
          _studentFullName = studentData['fullName']?.toString();
          _studentPhotoUrl = studentData['photoUrl']?.toString();
          _nextAction = studentData['nextAction']?.toString();
          _currentStep = _FlowStep.confirm;
        });
      }
    } catch (e) {
      String msg = 'Invalid Student ID. Please try again.';
      if (e is DioException && e.response?.data != null) {
        final errorData = e.response?.data;
        if (errorData['code'] == 'BLACKLISTED') {
          msg = 'Access Denied. This student has been blacklisted from campus access.';
        } else {
          msg = errorData['message'] ?? msg;
        }
      }
      setState(() {
        _errorMessage = msg;
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // Step 4: Submit Entry/Exit check-in
  Future<void> _submitAttendance() async {
    if (_isLoading) return;
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await _apiService.post('/campus-attendance/submit', data: {
        'userId': _studentUserId,
        'studentId': _idController.text.trim(),
        'campusId': _campusId,
        'action': _nextAction,
      });

      // Success on either 200 (exit) or 201 (entry)
      if ((response.statusCode == 200 || response.statusCode == 201) ||
          response.data != null) {
        setState(() {
          _currentStep = _FlowStep.success;
        });
      }
    } catch (e) {
      String msg = 'Failed to record attendance. Please try again.';
      if (e is DioException && e.response?.data != null) {
        msg = e.response?.data['message'] ?? msg;
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FB),
      appBar: AppBar(
        title: const Text('Campus Access Scan', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Colors.white)),
        backgroundColor: const Color(0xFF1B3A6B),
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _buildCurrentStepWidget(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentStepWidget() {
    switch (_currentStep) {
      case _FlowStep.qrScan:
        return _buildQRScanStep();
      case _FlowStep.idEntry:
        return _buildIDEntryStep();
      case _FlowStep.confirm:
        return _buildConfirmStep();
      case _FlowStep.success:
        return _buildSuccessStep();
    }
  }

  Widget _buildQRScanStep() {
    return Column(
      key: const ValueKey('qrScan'),
      children: [
        const Text(
          'Scan Campus Entrance QR Code',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0D1B38)),
        ),
        const SizedBox(height: 8),
        Text(
          'Position the dynamic QR code printed at the entrance gate within the camera scanner.',
          style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.4),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Container(
            height: 300,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.black,
              border: Border.all(color: Colors.white, width: 4),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 18, offset: const Offset(0, 8)),
              ],
            ),
            child: Stack(
              children: [
                MobileScanner(
                  controller: _scannerController,
                  onDetect: (capture) {
                    final List<Barcode> barcodes = capture.barcodes;
                    if (barcodes.isNotEmpty && barcodes.first.rawValue != null) {
                      _handleQrDetected(barcodes.first.rawValue!);
                    }
                  },
                ),
                if (_isLoading)
                  Container(
                    color: Colors.black54,
                    child: const Center(
                      child: CircularProgressIndicator(color: Colors.white),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildIDEntryStep() {
    return Card(
      key: const ValueKey('idEntry'),
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFF2563EB).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.domain_rounded, color: Color(0xFF2563EB), size: 20),
                ),
                const SizedBox(width: 12),
                Text(_campusName ?? 'Campus Selected', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0D1B38))),
              ],
            ),
            const SizedBox(height: 24),
            const Text(
              'Verify Student Identity',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0D1B38)),
            ),
            const SizedBox(height: 8),
            Text(
              'Enter your official registered Student ID to verify access permissions.',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.4),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _idController,
              decoration: InputDecoration(
                labelText: 'Student ID',
                hintText: 'e.g. S-001',
                prefixIcon: const Icon(Icons.badge_outlined),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                filled: true,
                fillColor: Colors.grey.shade50,
              ),
              textCapitalization: TextCapitalization.characters,
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.red.shade100)),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: Colors.red, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 28),
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: _resetFlow,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text('Rescan QR', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _verifyStudentId,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1B3A6B),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                    child: _isLoading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Verify ID', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConfirmStep() {
    final isEnter = _nextAction == 'ENTER';
    final themeColor = isEnter ? const Color(0xFF22C55E) : const Color(0xFFEF4444);

    return Card(
      key: const ValueKey('confirm'),
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Student Info Header card
            Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: const Color(0xFF1B3A6B).withValues(alpha: 0.1),
                  backgroundImage: _studentPhotoUrl != null ? NetworkImage(AppConstants.getImageUrl(_studentPhotoUrl!)) : null,
                  child: _studentPhotoUrl == null
                      ? Text(_studentFullName?.substring(0, 1).toUpperCase() ?? 'S', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Color(0xFF1B3A6B)))
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_studentFullName ?? 'Student Name', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0D1B38))),
                      const SizedBox(height: 2),
                      Text('Student ID: ${_idController.text.trim()}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 36),
            const Text(
              'Confirm Campus Access Action',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0D1B38)),
            ),
            const SizedBox(height: 24),
            // Entry / Exit indicator card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: themeColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: themeColor.withValues(alpha: 0.2), width: 1.5),
              ),
              child: Column(
                children: [
                  Icon(
                    isEnter ? Icons.login_rounded : Icons.logout_rounded,
                    color: themeColor,
                    size: 40,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    isEnter ? 'ENTRY' : 'EXIT',
                    style: TextStyle(color: themeColor, fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 1),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Campus: $_campusName',
                    style: const TextStyle(color: Color(0xFF0D1B38), fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _resetFlow,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      side: BorderSide(color: Colors.grey.shade300),
                    ),
                    child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _submitAttendance,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: themeColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                    child: _isLoading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text(isEnter ? 'Confirm Entry' : 'Confirm Exit', style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuccessStep() {
    return Card(
      key: const ValueKey('success'),
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(color: Color(0xFFE8F5E9), shape: BoxShape.circle),
              child: const Icon(Icons.check_circle_rounded, color: Color(0xFF22C55E), size: 48),
            ),
            const SizedBox(height: 24),
            const Text(
              'Access Recorded Successfully',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0D1B38)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'Your ${_nextAction == 'ENTER' ? 'entry to' : 'exit from'} $_campusName campus has been logged into the student portal.',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.5),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 36),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1B3A6B),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: const Text('Back to Home', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
