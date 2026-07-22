import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';

enum _FlowStep { qrScan, success }

class CampusAttendanceFlowScreen extends StatefulWidget {
  const CampusAttendanceFlowScreen({super.key});

  @override
  State<CampusAttendanceFlowScreen> createState() => _CampusAttendanceFlowScreenState();
}

class _CampusAttendanceFlowScreenState extends State<CampusAttendanceFlowScreen> {
  _FlowStep _currentStep = _FlowStep.qrScan;
  final MobileScannerController _scannerController = MobileScannerController(autoStart: true);
  final ApiService _apiService = ApiService();

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

  // GPS coordinates
  double? _latitude;
  double? _longitude;
  double? _accuracy;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkLocationPermissionAndGetGPS();
    });
  }

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  // Location permission state — drives the blocking UI overlay
  bool _locationBlocked = false;
  String _locationBlockReason = '';
  bool _isGpsServiceDisabled = false;
  bool _isPermanentlyDenied = false;

  Future<bool> _checkLocationPermissionAndGetGPS() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) {
        setState(() {
          _locationBlocked = true;
          _isPermanentlyDenied = false;
          _isGpsServiceDisabled = true;
          _locationBlockReason = 'Location services are turned off. Please turn on GPS/Location to scan your campus code.';
        });
      }
      return false;
    }

    permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.deniedForever) {
      if (mounted) {
        setState(() {
          _locationBlocked = true;
          _isPermanentlyDenied = true;
          _isGpsServiceDisabled = false;
          _locationBlockReason = 'Location access is needed to verify you are on campus. Please allow location permissions in your device settings.';
        });
      }
      return false;
    }

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (mounted) {
          setState(() {
            _locationBlocked = true;
            _isPermanentlyDenied = false;
            _isGpsServiceDisabled = false;
            _locationBlockReason = 'Location access is needed to verify you are on campus. Please allow location permissions in your device settings.';
          });
        }
        return false;
      }
      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          setState(() {
            _locationBlocked = true;
            _isPermanentlyDenied = true;
            _isGpsServiceDisabled = false;
            _locationBlockReason = 'Location access is needed to verify you are on campus. Please allow location permissions in your device settings.';
          });
        }
        return false;
      }
    }

    if (mounted) {
      setState(() {
        _locationBlocked = false;
        _locationBlockReason = '';
        _isPermanentlyDenied = false;
        _isGpsServiceDisabled = false;
        _isLoading = true;
      });
    }

    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );

      if (mounted) {
        setState(() {
          _latitude = position.latitude;
          _longitude = position.longitude;
          _accuracy = position.accuracy;
          _errorMessage = null;
        });
      }
      return true;
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to obtain GPS location. Please try again.';
        });
      }
      return false;
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _openSettingsAndRetry() async {
    await Geolocator.openAppSettings();
    await Future.delayed(const Duration(milliseconds: 500));
    await _checkLocationPermissionAndGetGPS();
  }

  Future<void> _openGpsSettingsAndRetry() async {
    await Geolocator.openLocationSettings();
    await Future.delayed(const Duration(milliseconds: 500));
    await _checkLocationPermissionAndGetGPS();
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
      _scannerController.start();
      _latitude = null;
      _longitude = null;
      _accuracy = null;
    });
    _checkLocationPermissionAndGetGPS();
  }

  // Automatic Scan Handler (No ID input required)
  Future<void> _handleQrDetected(String qrToken) async {
    if (_isLoading) return;

    if (_latitude == null || _longitude == null) {
      final hasGps = await _checkLocationPermissionAndGetGPS();
      if (!hasGps) return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Step 1: Validate QR code token
      final response = await _apiService.post('/campus-attendance/scan', data: {
        'qrToken': qrToken,
      });

      if (response.statusCode == 200 && response.data != null) {
        final campusData = response.data is Map ? response.data : {};
        _scannerController.stop();

        final campusId = campusData['campusId']?.toString();
        final campusName = campusData['campusName']?.toString();

        // Step 2: Retrieve logged-in student ID automatically from AuthProvider
        final authUser = Provider.of<AuthProvider>(context, listen: false).user;
        final studentId = authUser?['studentId']?.toString() ?? '';

        if (studentId.isEmpty) {
          throw Exception('Registered Student ID not found on login session.');
        }

        // Step 3: Verify Student ID automatically
        final verifyRes = await _apiService.post('/campus-attendance/verify-id', data: {
          'studentId': studentId,
          'campusId': campusId,
        });

        final studentData = verifyRes.data is Map ? verifyRes.data : {};
        final userId = studentData['userId']?.toString();
        final nextAction = studentData['nextAction']?.toString(); // 'ENTER' or 'EXIT'

        // Step 4: Automatically submit entry/exit attendance
        await _apiService.post('/campus-attendance/submit', data: {
          'userId': userId,
          'studentId': studentId,
          'campusId': campusId,
          'action': nextAction,
          'latitude': _latitude,
          'longitude': _longitude,
          'accuracy': _accuracy,
          'timestamp': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        });

        if (mounted) {
          setState(() {
            _campusId = campusId;
            _campusName = campusName;
            _studentUserId = userId;
            _studentFullName = studentData['fullName']?.toString() ?? authUser?['fullName']?.toString();
            _studentPhotoUrl = studentData['photoUrl']?.toString();
            _nextAction = nextAction;
            _currentStep = _FlowStep.success;
          });
        }
      }
    } catch (e) {
      String msg = 'Failed to record attendance. Please try again.';
      if (e is DioException && e.response?.data != null) {
        final errorData = e.response?.data;
        msg = errorData['message'] ?? msg;
      } else if (e is Exception) {
        msg = e.toString().replaceFirst('Exception: ', '');
      }
      if (!mounted) return;
      setState(() {
        _errorMessage = msg;
      });
      _scannerController.start();
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
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            onPressed: () {
              setState(() {
                _errorMessage = null;
                _locationBlocked = false;
              });
              _scannerController.start();
              _checkLocationPermissionAndGetGPS();
            },
          ),
        ],
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
      case _FlowStep.success:
        return _buildSuccessStep();
    }
  }

  Widget _buildSuccessStep() {
    final bool isEnter = _nextAction == 'ENTER';
    final Color primaryColor = isEnter ? const Color(0xFF22C55E) : const Color(0xFF2563EB);
    final String titleText = isEnter ? 'Welcome' : 'Good Bye';
    final String subtitleText = isEnter
        ? 'Welcome to ${_campusName ?? "Campus"}!'
        : 'Good Bye from ${_campusName ?? "Campus"}!';
    final String bodyText = isEnter
        ? 'Your entry has been automatically recorded.'
        : 'Your exit has been automatically recorded. See you next time!';

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
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: primaryColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isEnter ? Icons.check_circle_rounded : Icons.waving_hand_rounded,
                color: primaryColor,
                size: 48,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              titleText,
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w900,
                color: primaryColor,
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitleText,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0D1B38),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              bodyText,
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
