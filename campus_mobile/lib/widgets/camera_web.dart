// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui_web' as ui;
import 'package:flutter/material.dart';

/// Shows a modal dialog with a live camera stream in the browser.
Future<Uint8List?> showWebCameraCapture(BuildContext context) {
  return showDialog<Uint8List?>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const _WebCameraDialog(),
  );
}

class _WebCameraDialog extends StatefulWidget {
  const _WebCameraDialog();

  @override
  State<_WebCameraDialog> createState() => _WebCameraDialogState();
}

class _WebCameraDialogState extends State<_WebCameraDialog> {
  html.VideoElement? _video;
  html.MediaStream? _stream;
  bool _ready = false;
  bool _capturing = false;
  String? _error;
  static int _viewId = 0;
  late final String _elementId;

  @override
  void initState() {
    super.initState();
    _elementId = 'web-cam-view-${_viewId++}';
    _startCamera();
  }

  @override
  void dispose() {
    _stopStream();
    super.dispose();
  }

  Future<void> _startCamera() async {
    try {
      final stream = await html.window.navigator.mediaDevices?.getUserMedia({
        'video': {'facingMode': 'environment'}, // rear camera on phones
        'audio': false,
      });
      if (stream == null) {
        setState(() => _error = 'Camera not available in this browser.');
        return;
      }
      _stream = stream;
      final video = html.VideoElement()
        ..autoplay = true
        ..muted = true
        ..srcObject = stream
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.objectFit = 'cover';
      _video = video;

      // Register the video element as a platform view
      // ignore: undefined_prefixed_name
      ui.platformViewRegistry.registerViewFactory(
        _elementId,
        (_) => video,
      );

      // Wait for video metadata to load
      video.onLoadedMetadata.first.then((_) {
        if (mounted) setState(() => _ready = true);
      });
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Could not access camera: $e');
      }
    }
  }

  void _stopStream() {
    _stream?.getTracks().forEach((t) => t.stop());
    _stream = null;
    _video = null;
  }

  /// Captures a frame from the video stream and returns JPEG bytes.
  Future<Uint8List?> _captureFrame() async {
    final video = _video;
    if (video == null || !_ready) return null;

    setState(() => _capturing = true);

    final canvas = html.CanvasElement(
      width: video.videoWidth,
      height: video.videoHeight,
    );
    canvas.context2D.drawImage(video, 0, 0);

    Uint8List? bytes;
    try {
      final dataUrl = canvas.toDataUrl('image/jpeg', 0.92);
      final commaIndex = dataUrl.indexOf(',');
      if (commaIndex != -1) {
        final base64Str = dataUrl.substring(commaIndex + 1);
        bytes = base64.decode(base64Str);
      }
    } catch (_) {
      bytes = null;
    }

    if (mounted) setState(() => _capturing = false);
    return bytes;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      backgroundColor: Colors.black,
      insetPadding: const EdgeInsets.all(16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: SizedBox(
          width: 380,
          height: 520,
          child: Stack(
            children: [
              // Camera preview
              if (_error != null)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.no_photography_rounded, color: Colors.white54, size: 64),
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          style: const TextStyle(color: Colors.white70, fontSize: 14),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        TextButton(
                          onPressed: () => Navigator.pop(context, null),
                          child: const Text('Close', style: TextStyle(color: Colors.white)),
                        ),
                      ],
                    ),
                  ),
                )
              else if (!_ready)
                const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: Colors.white),
                      SizedBox(height: 16),
                      Text('Starting camera...', style: TextStyle(color: Colors.white70)),
                    ],
                  ),
                )
              else
                // Video stream platform view
                HtmlElementView(viewType: _elementId),

              // Top bar — close button
              Positioned(
                top: 12,
                right: 12,
                child: GestureDetector(
                  onTap: () {
                    _stopStream();
                    Navigator.pop(context, null);
                  },
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: Colors.black54,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close_rounded, color: Colors.white, size: 22),
                  ),
                ),
              ),

              // Bottom — capture button
              if (_ready)
                Positioned(
                  bottom: 32,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: GestureDetector(
                      onTap: _capturing
                          ? null
                          : () async {
                              final bytes = await _captureFrame();
                              if (!mounted) return;
                              _stopStream();
                              Navigator.pop(context, bytes);
                            },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        width: _capturing ? 64 : 72,
                        height: _capturing ? 64 : 72,
                        decoration: BoxDecoration(
                          color: _capturing ? Colors.grey : Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white54, width: 4),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.3),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: _capturing
                            ? const Padding(
                                padding: EdgeInsets.all(18),
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(
                                Icons.camera_alt_rounded,
                                color: Colors.black87,
                                size: 32,
                              ),
                      ),
                    ),
                  ),
                ),

              // Label
              if (_ready)
                const Positioned(
                  bottom: 12,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Text(
                      'Tap to capture',
                      style: TextStyle(color: Colors.white60, fontSize: 12),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
