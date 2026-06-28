import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../providers/auth_provider.dart';

class StudentIdScreen extends StatelessWidget {
  const StudentIdScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final studentId = user?['studentId'] ?? user?['id'] ?? 'Unknown';
    final qrCodeData = user?['qrCode'] ?? studentId;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Digital Identity'),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Text(
                      user?['fullName'] ?? 'Student Name',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    const Text('Student Portal Access', style: TextStyle(color: Colors.grey)),
                    const SizedBox(height: 24),
                    QrImageView(
                      data: qrCodeData,
                      size: 200.0,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'ID: $studentId',
                      style: const TextStyle(fontSize: 18, fontFamily: 'monospace', fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 40),
              const Text(
                'Show this QR code to the security guard at campus entry/exit points.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
