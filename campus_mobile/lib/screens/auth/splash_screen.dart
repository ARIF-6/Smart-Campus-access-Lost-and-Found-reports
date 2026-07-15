import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import 'dart:async';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;
  late Animation<double> _slideAnim;

  String _statusText = 'Initializing services...';
  bool _serverReady = false;

  /// Start backend warmup asynchronously in the background.
  /// Wakes up the Render server early so it is ready by the time the user logs in.
  void _warmupBackendInBackground() {
    ApiService().get('/ping').then((_) {
      if (mounted) {
        setState(() {
          _serverReady = true;
          _statusText = 'Connected!';
        });
      }
    }).catchError((_) {
      // Ignored: we just want to wake up the server
    });
  }

  /// Snappy splash duration timer to show the login screen quickly.
  Future<void> _startStartupTimer() async {
    await Future.delayed(const Duration(milliseconds: 1500));
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.55, curve: Curves.easeOut)),
    );
    _scaleAnim = Tween<double>(begin: 0.65, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.1, 0.7, curve: Curves.easeOutBack)),
    );
    _slideAnim = Tween<double>(begin: 30, end: 0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.3, 0.85, curve: Curves.easeOut)),
    );

    _controller.forward();

    // Start background warmup and navigation timer
    _warmupBackendInBackground();
    _startStartupTimer();
  }


  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0D1F4E), AppConstants.primaryNavy, Color(0xFF2563EB)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Stack(
          children: [
            // Background university image with low opacity
            Positioned.fill(
              child: Opacity(
                opacity: 0.12,
                child: Image.asset(
                  'assets/images/university.jpeg',
                  fit: BoxFit.cover,
                ),
              ),
            ),

            // Decorative circles (like the banking app background bubbles)
            Positioned(
              top: -80, right: -80,
              child: _circle(260, Colors.white.withValues(alpha: 0.04)),
            ),
            Positioned(
              top: 120, right: -120,
              child: _circle(220, Colors.white.withValues(alpha: 0.03)),
            ),
            Positioned(
              bottom: -100, left: -80,
              child: _circle(300, Colors.white.withValues(alpha: 0.04)),
            ),
            Positioned(
              bottom: 120, left: -60,
              child: _circle(180, Colors.white.withValues(alpha: 0.03)),
            ),

            // Center content
            SafeArea(
              child: Center(
                child: AnimatedBuilder(
                  animation: _controller,
                  builder: (_, __) => FadeTransition(
                    opacity: _fadeAnim,
                    child: Transform.translate(
                      offset: Offset(0, _slideAnim.value),
                      child: ScaleTransition(
                        scale: _scaleAnim,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 120,
                              height: 120,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(32),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.22),
                                    blurRadius: 40,
                                    offset: const Offset(0, 16),
                                  ),
                                ],
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(18),
                                child: Image.asset(
                                  'assets/images/logo.jpg',
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),
                            const SizedBox(height: 36),
                            // App name
                            const Text(
                              'Smart Campus',
                              style: TextStyle(
                                fontSize: 30,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Your Campus. Connected.',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w400,
                                color: Colors.white.withValues(alpha: 0.7),
                                letterSpacing: 0.3,
                              ),
                            ),
                            const SizedBox(height: 50),
                            // Subtle loading dots
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(3, (i) => _loadingDot(i)),
                            ),
                            const SizedBox(height: 20),
                            // Live server status message
                            AnimatedSwitcher(
                              duration: const Duration(milliseconds: 400),
                              child: Text(
                                _statusText,
                                key: ValueKey(_statusText),
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w400,
                                  color: _serverReady
                                      ? Colors.greenAccent.withValues(alpha: 0.9)
                                      : Colors.white.withValues(alpha: 0.6),
                                  letterSpacing: 0.2,
                                ),
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
          ],
        ),
      ),
    );
  }

  Widget _circle(double size, Color color) => Container(
        width: size, height: size,
        decoration: BoxDecoration(shape: BoxShape.circle, color: color),
      );

  Widget _loadingDot(int index) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, __) {
        final t = (_controller.value - index * 0.15).clamp(0.0, 1.0);
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 5),
          width: 8, height: 8,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.3 + 0.7 * t),
          ),
        );
      },
    );
  }
}
