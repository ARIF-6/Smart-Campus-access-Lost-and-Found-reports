import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:dio/dio.dart' as dio;
import 'cleaner_dashboard.dart';
import '../settings_screen.dart';
import '../../providers/auth_provider.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import '../../core/permission_helper.dart';

class CleanerProfileScreen extends StatefulWidget {
  const CleanerProfileScreen({super.key});

  @override
  State<CleanerProfileScreen> createState() => _CleanerProfileScreenState();
}

class _CleanerProfileScreenState extends State<CleanerProfileScreen> {
  final ApiService _api = ApiService();
  bool _isUploading = false;
  int _itemsHandled = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _fetchStats();
    });
  }

  Future<void> _pickAndUploadImage() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final messenger = ScaffoldMessenger.of(context);

    // ── Android: request photo / storage permission before opening gallery ──
    if (!kIsWeb) {
      final status = await PermissionHelper.photosPermission.request();
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
      
      dio.FormData formData = dio.FormData.fromMap({
        "profilePicture": dio.MultipartFile.fromBytes(
          bytes,
          filename: fileName,
        ),
      });

      final response = await _api.put('/auth/profile-picture', data: formData);

      if (!mounted) return;
      if (response.statusCode == 200) {
        final newPhotoUrl = response.data['photoUrl'];
        if (mounted) {
          await authProvider.updateUserLocally({
            'photoUrl': newPhotoUrl,
          });
          messenger.showSnackBar(
            const SnackBar(
              content: Text('Profile picture updated!'),
              behavior: SnackBarBehavior.floating,
              backgroundColor: Color(0xFF0D47A1),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Failed to update photo'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  // Use shared image URL helper to correctly build URLs for both web and mobile
  String _getProfileImageUrl(String? path) {
    return AppConstants.getImageUrl(path);
  }

  Future<void> _fetchStats() async {
    try {
      // Fetch full profile to get phone number and other missing details
      final profileRes = await _api.get('/auth/profile');
      if (!mounted) return;
      if (profileRes.statusCode == 200 && profileRes.data != null) {
        if (mounted) {
          Provider.of<AuthProvider>(context, listen: false).updateUserLocally(profileRes.data);
        }
      }

      // Fetch items submitted by this cleaner
      final res = await _api.get('/found-items/my');
      if (!mounted) return;
      if (res.statusCode == 200 && res.data != null) {
        if (mounted) {
          setState(() {
            _itemsHandled = (res.data as List).length;
          });
        }
      }
    } catch (e) {
      debugPrint("Fetch stats error: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final fullName = user?['fullName'] ?? 'Staff Name';
    final photoUrl = _getProfileImageUrl(user?['photoUrl']);

    final bool isActive = auth.isAuthenticated;
    final String statusText = isActive ? 'Active' : 'Inactive';
    final Color statusColor = isActive ? Colors.green : Colors.red;

    const primaryBlue = Color(0xFF0D47A1);
    const scaffoldBg = Color(0xFFF5F5F5);

    return Scaffold(
      backgroundColor: scaffoldBg,
      body: Stack(
        children: [
          // Curved Header
          ClipPath(
            clipper: HeaderClipper(),
            child: Container(
              height: 220,
              color: primaryBlue,
              width: double.infinity,
              padding: const EdgeInsets.only(top: 50, left: 20, right: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () {
                      if (Navigator.of(context).canPop()) {
                        Navigator.of(context).pop();
                      } else {
                        final mainState = context.findAncestorStateOfType<CleanerDashboardState>();
                        if (mainState != null) {
                          mainState.currentIndex = 0;
                        }
                      }
                    },
                  ),
                  const Text(
                    'CLEANER PROFILE',
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1.2),
                  ),
                  IconButton(
                    icon: const Icon(Icons.settings, color: Colors.white, size: 24),
                    onPressed: () => Navigator.push(context, SettingsScreen.route()),
                  ),
                ],
              ),
            ),
          ),

          // Content
          RefreshIndicator(
            onRefresh: _fetchStats,
            color: primaryBlue,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(top: 120, left: 25, right: 25, bottom: 40),
              child: Column(
                children: [
                  // Main Info Card
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(15),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 5))],
                    ),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                         Stack(
                           alignment: Alignment.bottomRight,
                           children: [
                             GestureDetector(
                               onTap: _isUploading ? null : _pickAndUploadImage,
                               child: CircleAvatar(
                                 radius: 45,
                                 backgroundColor: Colors.grey.shade200,
                                 backgroundImage: photoUrl.isNotEmpty ? NetworkImage(photoUrl) : null,
                                 child: photoUrl.isEmpty ? const Icon(Icons.person, size: 50, color: Colors.grey) : null,
                               ),
                             ),
                             GestureDetector(
                               onTap: _isUploading ? null : _pickAndUploadImage,
                               child: CircleAvatar(
                                 radius: 14,
                                 backgroundColor: primaryBlue,
                                 child: _isUploading
                                     ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                     : const Icon(Icons.camera_alt, color: Colors.white, size: 14),
                               ),
                             ),
                           ],
                         ),
                        const SizedBox(height: 15),
                        Text(fullName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87)),
                        const SizedBox(height: 5),
                        const Text('MAINTENANCE & CLEANING STAFF', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1)),
                        const SizedBox(height: 15),
                        const Divider(height: 1, thickness: 0.5),
                        const SizedBox(height: 15),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Column(
                              children: [
                                Text('$_itemsHandled', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: primaryBlue)),
                                const Text('Items Handled', style: TextStyle(fontSize: 12, color: Colors.grey)),
                              ],
                            ),
                            const SizedBox(width: 40),
                            Column(
                              children: [
                                Text(statusText, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: statusColor)),
                                const Text('Status', style: TextStyle(fontSize: 12, color: Colors.grey)),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),



                  // Actions
                  _buildActionItem('More Info', () {}),
                  const SizedBox(height: 15),
                  _buildActionItem('Settings', () => Navigator.push(context, SettingsScreen.route())),
                  const SizedBox(height: 15),
                  _buildActionItem('Logout', () => auth.logout(), isLogout: true),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }


  Widget _buildActionItem(String title, VoidCallback onTap, {bool isLogout = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: const Color(0xFFE8EAF6),
          borderRadius: BorderRadius.circular(12),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: isLogout ? Colors.red.shade700 : const Color(0xFF0D47A1))),
            Icon(Icons.arrow_forward, size: 18, color: isLogout ? Colors.red.shade700 : const Color(0xFF0D47A1)),
          ],
        ),
      ),
    );
  }
}

class HeaderClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    var path = Path();
    path.lineTo(0, size.height - 50);
    path.quadraticBezierTo(size.width / 4, size.height, size.width / 2, size.height);
    path.quadraticBezierTo(size.width * 3 / 4, size.height, size.width, size.height - 50);
    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}


