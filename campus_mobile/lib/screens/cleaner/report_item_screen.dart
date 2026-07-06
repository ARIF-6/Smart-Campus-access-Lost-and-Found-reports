import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../../core/constants.dart';
import '../../services/api_service.dart';
import '../../widgets/web_camera_capture.dart';
import '../../core/permission_helper.dart';
import '../../services/socket_service.dart';

class ReportItemScreen extends StatefulWidget {
  const ReportItemScreen({super.key});

  @override
  State<ReportItemScreen> createState() => _ReportItemScreenState();
}

class _ReportItemScreenState extends State<ReportItemScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _locController = TextEditingController();

  String? _selectedCategory;
  XFile? _imageFile;
  Uint8List? _webImage;
  bool _isLoading = false;

  final ApiService _apiService = ApiService();
  final ImagePicker _picker = ImagePicker();
  static const _themeColor = Color(0xFF0D47A1);

  List<Map<String, dynamic>> _categories = [];

  final SocketService _socketService = SocketService();

  @override
  void initState() {
    super.initState();
    _selectedCategory = null;
    _fetchCategories();
    _socketService.on('category:updated', (_) {
      if (mounted) _fetchCategories();
    });
  }

  @override
  void dispose() {
    _socketService.off('category:updated');
    _titleController.dispose();
    _descController.dispose();
    _locController.dispose();
    super.dispose();
  }

  Future<void> _fetchCategories() async {
    try {
      final response = await _apiService.get('/categories/lost-found');
      if (response.statusCode == 200 && response.data is List) {
        setState(() {
          _categories = (response.data as List).map((e) => {
                'value': e['name'] ?? '',
                'label': e['name'] ?? '',
                'icon': Icons.category_rounded,
              }).toList();
          if (_selectedCategory == null && _categories.isNotEmpty) {
            _selectedCategory = _categories.first['value'] as String;
          }
        });
      }
    } catch (e) {
      // ignore errors for now
    }
  }

  /// Request camera permission explicitly, then open the camera.
  /// For gallery, request photos permission (Android 13+) then open gallery.
  Future<void> _pickImage(ImageSource source) async {
    if (kIsWeb) {
      if (source == ImageSource.camera) {
        final bytes = await showWebCameraCapture(context);
        if (bytes == null || !mounted) return;
        setState(() {
          _imageFile = XFile.fromData(bytes, name: 'camera_capture.jpg');
          _webImage = bytes;
        });
        return;
      }
      // Web: gallery picker is handled by the browser — pick directly.
      final XFile? picked = await _picker.pickImage(source: source, maxWidth: 1200, imageQuality: 85);
      if (!mounted || picked == null) return;
      final bytes = await picked.readAsBytes();
      if (!mounted) return;
      setState(() { _imageFile = picked; _webImage = bytes; });
      return;
    }

    // ── Native (Android / iOS) ──────────────────────────────────────
    final Permission permission =
        source == ImageSource.camera ? Permission.camera : PermissionHelper.photosPermission;

    PermissionStatus status = await permission.request();

    if (status.isGranted) {
      final XFile? picked = await _picker.pickImage(
        source: source,
        maxWidth: 1200,
        imageQuality: 85,
      );
      if (!mounted || picked == null) return;
      final bytes = await picked.readAsBytes();
      if (!mounted) return;
      setState(() { _imageFile = picked; _webImage = bytes; });
    } else if (status.isPermanentlyDenied) {
      if (!mounted) return;
      final label = source == ImageSource.camera ? 'Camera' : 'Photos';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$label permission permanently denied. Please enable it in Settings.'),
          backgroundColor: AppConstants.errorColor,
          action: SnackBarAction(
            label: 'Settings',
            textColor: Colors.white,
            onPressed: openAppSettings,
          ),
        ),
      );
    } else {
      if (!mounted) return;
      final label = source == ImageSource.camera ? 'Camera' : 'Photos';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$label permission denied. Cannot open ${source == ImageSource.camera ? "camera" : "gallery"}.'),
          backgroundColor: AppConstants.errorColor,
        ),
      );
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategory == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a category'), backgroundColor: AppConstants.errorColor));
      return;
    }
    if (_imageFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select an item photo'), backgroundColor: AppConstants.errorColor));
      return;
    }
    setState(() => _isLoading = true);
    try {
      String fileName = _imageFile!.name;
      if (!fileName.toLowerCase().endsWith('.jpg') && !fileName.toLowerCase().endsWith('.jpeg') && !fileName.toLowerCase().endsWith('.png')) fileName += '.jpg';
      
      MultipartFile imageFile;
      if (kIsWeb) {
        imageFile = MultipartFile.fromBytes(_webImage!, filename: fileName, contentType: MediaType('image', 'jpeg'));
      } else {
        imageFile = await MultipartFile.fromFile(_imageFile!.path, filename: fileName, contentType: MediaType('image', 'jpeg'));
      }

      final formData = FormData.fromMap({
        'title': _titleController.text.trim(),
        'description': _descController.text.trim(),
        'category': _selectedCategory!.toLowerCase(),
        'locationFound': _locController.text.trim(),
        'dateFound': DateTime.now().toIso8601String(),
        'status': 'pending',
        'image': imageFile,
      });
      final response = await _apiService.post('/found-items', data: formData);
      if (!mounted) return;
      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Item reported successfully!'), backgroundColor: AppConstants.successColor, behavior: SnackBarBehavior.floating));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: ${e.toString().replaceAll('DioException', 'Network error')}'), backgroundColor: AppConstants.errorColor));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 110,
            floating: false,
            pinned: true,
            elevation: 0,
            backgroundColor: _themeColor,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              title: const Text('Report Found Item', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: Colors.white)),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [_themeColor, _themeColor.withValues(alpha: 0.75)]),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Image Picker - Side-by-side cards or Preview
                    _webImage != null
                        ? Container(
                            height: 210,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: _themeColor, width: 2),
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 16, offset: const Offset(0, 4))],
                            ),
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                ClipRRect(borderRadius: BorderRadius.circular(24), child: Image.memory(_webImage!, fit: BoxFit.cover)),
                                Positioned(
                                  top: 12,
                                  right: 12,
                                  child: GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _imageFile = null;
                                        _webImage = null;
                                      });
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: const BoxDecoration(
                                        color: Colors.black54,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.close_rounded, color: Colors.white, size: 18),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )
                        : Row(
                            children: [
                              Expanded(
                                child: GestureDetector(
                                  onTap: () => _pickImage(ImageSource.gallery),
                                  child: Container(
                                    height: 140,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE8E8E8),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Container(
                                          width: 56,
                                          height: 56,
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFFFD2D2),
                                            borderRadius: BorderRadius.circular(14),
                                          ),
                                          child: const Icon(
                                            Icons.photo_library_rounded,
                                            color: Color(0xFFE53935),
                                            size: 28,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        const Text(
                                          'upload photo',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFF4B5563),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: GestureDetector(
                                  onTap: () => _pickImage(ImageSource.camera),
                                  child: Container(
                                    height: 140,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE8E8E8),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Container(
                                          width: 56,
                                          height: 56,
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFFFD2D2),
                                            borderRadius: BorderRadius.circular(14),
                                          ),
                                          child: const Icon(
                                            Icons.camera_alt_rounded,
                                            color: Color(0xFFE53935),
                                            size: 28,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        const Text(
                                          'take photo',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFF4B5563),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                    const SizedBox(height: 24),

                    // Item Details
                    _sectionTitle('Item Details'),
                    _formCard([
                      _field(controller: _titleController, label: 'Item Title', hint: 'e.g. Blue Backpack', icon: Icons.label_rounded, validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null),
                      _divider(),
                      _categoryDropdown(),
                    ]),
                    const SizedBox(height: 20),

                    // Description
                    _sectionTitle('Description'),
                    _formCard([
                      _field(controller: _descController, label: 'Description', hint: 'Describe the item...', icon: Icons.description_rounded, maxLines: 4),
                    ]),
                    const SizedBox(height: 20),

                    // Location
                    _sectionTitle('Location Found'),
                    _formCard([
                      _field(controller: _locController, label: 'Where was it found?', hint: 'e.g. Block B, Library', icon: Icons.location_on_rounded, validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null),
                    ]),
                    const SizedBox(height: 36),

                    // Submit
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _submit,
                        style: ElevatedButton.styleFrom(backgroundColor: _themeColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)), elevation: 0, disabledBackgroundColor: _themeColor.withValues(alpha: 0.55)),
                        child: _isLoading
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                            : const Row(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.upload_rounded, size: 22), SizedBox(width: 10), Text('Submit Report', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800))]),
                      ),
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String t) => Padding(padding: const EdgeInsets.only(left: 4, bottom: 12), child: Text(t, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF1E293B))));

  Widget _formCard(List<Widget> children) => Container(
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 16, offset: const Offset(0, 4))]),
    child: Column(children: children),
  );

  Widget _divider() => Divider(height: 1, indent: 16, endIndent: 16, color: Colors.grey.shade100);

  Widget _field({required TextEditingController controller, required String label, required String hint, required IconData icon, int maxLines = 1, String? Function(String?)? validator}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      child: TextFormField(
        controller: controller, maxLines: maxLines, validator: validator,
        decoration: InputDecoration(labelText: label, hintText: hint, hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13), prefixIcon: Icon(icon, color: _themeColor, size: 20), border: InputBorder.none, contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14)),
      ),
    );
  }

  Widget _categoryDropdown() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      child: DropdownButtonFormField<String>(
        value: _selectedCategory,
        decoration: InputDecoration(labelText: 'Category', prefixIcon: Icon(Icons.category_rounded, color: _themeColor, size: 20), border: InputBorder.none, contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14)),
        items: _categories.map((c) => DropdownMenuItem<String>(value: c['value'] as String, child: Row(children: [Icon(c['icon'] as IconData, size: 18, color: Colors.grey.shade600), const SizedBox(width: 8), Text(c['label'] as String)]))).toList(),
        onChanged: (v) => setState(() => _selectedCategory = v),
      ),
    );
  }
}
