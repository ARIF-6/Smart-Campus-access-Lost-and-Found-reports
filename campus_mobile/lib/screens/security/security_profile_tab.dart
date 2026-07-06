import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:dio/dio.dart';
import '../settings_screen.dart';
import '../../providers/auth_provider.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import '../../core/permission_helper.dart';

class SecurityProfileTab extends StatefulWidget {
  const SecurityProfileTab({super.key});

  @override
  State<SecurityProfileTab> createState() => _SecurityProfileTabState();
}

class _SecurityProfileTabState extends State<SecurityProfileTab> with TickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  bool _isUploading = false;
  late AnimationController _contentController;

  // Design Constants (Matching Drawer)
  static const _gradientStart = Color(0xFF0A1628);
  static const _gradientMid = Color(0xFF0D3B8E);
  static const _gradientEnd = Color(0xFF1565C0);
  static const _accentGold = Color(0xFFFFD54F);

  @override
  void initState() {
    super.initState();
    _contentController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _fetchProfile();
        _contentController.forward();
      }
    });
  }

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _fetchProfile() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    try {
      final response = await _apiService.get('/auth/profile');
      if (response.statusCode == 200 && response.data != null && mounted) {
        authProvider.updateUserLocally(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching profile: $e');
    }
  }

  Future<void> _pickAndUploadImage() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final messenger = ScaffoldMessenger.of(context);

    // ── Android: request photo / storage permission before opening gallery ──
    if (!kIsWeb) {
      final permission = PermissionHelper.photosPermission;
      final status = await permission.request();
      if (!mounted) return;
      if (status.isPermanentlyDenied) {
        messenger.showSnackBar(SnackBar(
          content: const Text('Photos permission permanently denied. Enable it in Settings.'),
          backgroundColor: AppConstants.errorColor,
          action: SnackBarAction(
            label: 'Settings',
            textColor: Colors.white,
            onPressed: openAppSettings,
          ),
        ));
        return;
      }
      if (!status.isGranted) {
        messenger.showSnackBar(const SnackBar(
          content: Text('Photos permission denied. Cannot open gallery.'),
          backgroundColor: AppConstants.errorColor,
        ));
        return;
      }
    }

    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 70,
    );

    if (!mounted || image == null) return;

    setState(() => _isUploading = true);

    try {
      final bytes = await image.readAsBytes();
      if (!mounted) return;
      final fileName = image.name;

      FormData formData = FormData.fromMap({
        "profilePicture": MultipartFile.fromBytes(
          bytes,
          filename: fileName,
        ),
      });

      final response = await _apiService.put('/auth/profile-picture', data: formData);

      if (!mounted) return;
      if (response.statusCode == 200) {
        final newPhotoUrl = response.data['photoUrl'];
        if (mounted) {
          await authProvider.updateUserLocally({
            'photoUrl': newPhotoUrl,
          });
          messenger.showSnackBar(
            const SnackBar(
              content: Text('Profile picture updated successfully'),
              behavior: SnackBarBehavior.floating,
              backgroundColor: _gradientMid,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Failed to update profile picture'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  String _getProfileImageUrl(String? path) {
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
    final fullName = user?['fullName'] ?? 'Security Officer';
    final employeeId = user?['studentId'] ?? 'SEC-2026-042';
    final photoUrl = _getProfileImageUrl(user?['photoUrl']);

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FA),
      body: Stack(
        children: [
          // ── Premium Header ──────────────────────────────
          ClipPath(
            clipper: HeaderClipper(),
            child: Container(
              height: 280,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [_gradientStart, _gradientMid, _gradientEnd],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    right: -30,
                    top: -20,
                    child: CircleAvatar(
                      radius: 80,
                      backgroundColor: Colors.white.withValues(alpha: 0.05),
                    ),
                  ),
                  Positioned(
                    left: 40,
                    bottom: 40,
                    child: CircleAvatar(
                      radius: 30,
                      backgroundColor: Colors.white.withValues(alpha: 0.03),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Content ────────────────────────────────────
          SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.only(top: 130, left: 20, right: 20, bottom: 40),
            child: Column(
              children: [
                // Profile Card
                _buildAnimatedItem(
                  delay: 0.1,
                  child: Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.06),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        )
                      ],
                    ),
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Stack(
                          alignment: Alignment.bottomRight,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: _accentGold.withValues(alpha: 0.5), width: 2),
                              ),
                              child: CircleAvatar(
                                radius: 50,
                                backgroundColor: Colors.grey.shade100,
                                backgroundImage: photoUrl.isNotEmpty ? NetworkImage(photoUrl) : null,
                                child: photoUrl.isEmpty
                                    ? const Icon(Icons.security_rounded, size: 50, color: _gradientMid)
                                    : null,
                              ),
                            ),
                            GestureDetector(
                              onTap: _isUploading ? null : _pickAndUploadImage,
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: const BoxDecoration(
                                  color: _gradientMid,
                                  shape: BoxShape.circle,
                                  boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 8)],
                                ),
                                child: _isUploading
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                      )
                                    : const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 16),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          fullName,
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1A1C1E)),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'OFFICER ID: $employeeId',
                          style: TextStyle(fontSize: 13, color: Colors.grey.shade600, fontWeight: FontWeight.w600, letterSpacing: 0.5),
                        ),
                        const SizedBox(height: 20),
                        
                        // Active Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFA5D6A7), width: 1),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Colors.green,
                                  shape: BoxShape.circle,
                                  boxShadow: [BoxShadow(color: Colors.greenAccent, blurRadius: 4, spreadRadius: 1)],
                                ),
                              ),
                              const SizedBox(width: 10),
                              const Text(
                                'ACTIVE ON SHIFT',
                                style: TextStyle(color: Color(0xFF2E7D32), fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 0.8),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 20),



                // Action Items
                _buildAnimatedItem(delay: 0.3, child: _buildActionTile('Activity History', Icons.history_rounded, () {})),
                const SizedBox(height: 12),
                _buildAnimatedItem(delay: 0.4, child: _buildActionTile('Account Settings', Icons.manage_accounts_rounded, () => Navigator.push(context, SettingsScreen.route()))),
                const SizedBox(height: 12),
                _buildAnimatedItem(
                  delay: 0.5,
                  child: _buildActionTile(
                    'Logout', 
                    Icons.logout_rounded, 
                    () async {
                      await auth.logout();
                      if (context.mounted) {
                        Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
                      }
                    }, 
                    isDanger: true,
                  ),
                ),
              ],
            ),
          ),

          // ── Fixed Top Header (Hit-test safe) ──────────
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Text(
                      'SECURITY PROFILE',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 1.5),
                    ),
                    IconButton(
                      icon: const Icon(Icons.settings_outlined, color: Colors.white, size: 22),
                      onPressed: () => Navigator.push(context, SettingsScreen.route()),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnimatedItem({required double delay, required Widget child}) {
    return FadeTransition(
      opacity: Tween<double>(begin: 0, end: 1).animate(
        CurvedAnimation(
          parent: _contentController,
          curve: Interval(delay, delay + 0.3, curve: Curves.easeIn),
        ),
      ),
      child: SlideTransition(
        position: Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero).animate(
          CurvedAnimation(
            parent: _contentController,
            curve: Interval(delay, delay + 0.3, curve: Curves.easeOutCubic),
          ),
        ),
        child: child,
      ),
    );
  }


  Widget _buildActionTile(String title, IconData icon, VoidCallback onTap, {bool isDanger = false}) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDanger ? Colors.red.shade50 : Colors.grey.shade100, width: 1),
          ),
          child: Row(
            children: [
              Icon(icon, color: isDanger ? Colors.red.shade700 : _gradientMid, size: 22),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: isDanger ? Colors.red.shade700 : const Color(0xFF1A1C1E),
                  ),
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: isDanger ? Colors.red.shade200 : Colors.grey.shade300, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class HeaderClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    var path = Path();
    path.lineTo(0, size.height - 60);
    path.quadraticBezierTo(size.width / 4, size.height, size.width / 2, size.height);
    path.quadraticBezierTo(size.width * 3 / 4, size.height, size.width, size.height - 60);
    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}
