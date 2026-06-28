import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';

class AccessLogsScreen extends StatefulWidget {
  const AccessLogsScreen({super.key});

  @override
  State<AccessLogsScreen> createState() => _AccessLogsScreenState();
}

class _AccessLogsScreenState extends State<AccessLogsScreen> {
  final ApiService _apiService = ApiService();
  List<Map<String, dynamic>> logs = [];
  bool _isLoading = true;
  String _errorMessage = '';

  int _todayScans = 0;
  int _todayEntries = 0;
  int _todayExits = 0;

  @override
  void initState() {
    super.initState();
    _fetchLogs();
  }

  Future<void> _fetchLogs() async {
    if (!mounted) return;
    if (mounted) {
      setState(() {
        _isLoading = true;
        _errorMessage = '';
      });
    }
    try {
      final response = await _apiService.get('/access/logs');
      final data = response.data as List;

      List<Map<String, dynamic>> parsedLogs = [];
      int scans = 0;
      int entries = 0;
      int exits = 0;

      for (var rawLog in data) {
        scans++;
        final student = rawLog['student'];
        final name = student != null ? student['name'] : 'Unknown';
        final img = student != null ? student['photoUrl'] : null;

        if (rawLog['entryTime'] != null) {
          entries++;
          final dt = DateTime.parse(rawLog['entryTime']).toLocal();
          parsedLogs.add({
            'name': name,
            'id': rawLog['personId'] ?? '',
            'type': 'ENTRY',
            'time': DateFormat('HH:mm').format(dt),
            'timestamp': dt,
            'location': 'Main Gate (QR)',
            'img': img,
          });
        }
        if (rawLog['exitTime'] != null) {
          exits++;
          final dt = DateTime.parse(rawLog['exitTime']).toLocal();
          parsedLogs.add({
            'name': name,
            'id': rawLog['personId'] ?? '',
            'type': 'EXIT',
            'time': DateFormat('HH:mm').format(dt),
            'timestamp': dt,
            'location': 'Main Gate (QR)',
            'img': img,
          });
        }
      }

      parsedLogs.sort((a, b) => b['timestamp'].compareTo(a['timestamp']));

      if (mounted) {
        setState(() {
          logs = parsedLogs;
          _todayScans = scans;
          _todayEntries = entries;
          _todayExits = exits;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load logs.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Access Logs'),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchLogs,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                            child: _summaryChip(
                                'Scans',
                                '$_todayScans',
                                AppConstants.primaryColor,
                                Icons.qr_code_scanner)),
                        const SizedBox(width: 8),
                        Expanded(
                            child: _summaryChip('In', '$_todayEntries',
                                AppConstants.statusValid, Icons.login)),
                        const SizedBox(width: 8),
                        Expanded(
                            child: _summaryChip('Out', '$_todayExits',
                                AppConstants.statusInvalid, Icons.logout)),
                      ],
                    ),
                    const SizedBox(height: 24),
                    if (_errorMessage.isNotEmpty)
                      Center(
                          child: Text(_errorMessage,
                              style: const TextStyle(color: Colors.red)))
                    else if (logs.isEmpty)
                      const Center(child: Text('No logs found.'))
                    else
                      ...logs.map((log) => _buildLogCard(log)),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _summaryChip(String label, String val, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          Text(val,
              style: TextStyle(
                  fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildLogCard(Map<String, dynamic> log) {
    final bool isEntry = log['type'] == 'ENTRY';
    final Color stripColor =
        isEntry ? AppConstants.primaryColor : AppConstants.statusInvalid;
    final Color badgeBg = isEntry
        ? AppConstants.primaryColor.withValues(alpha: 0.1)
        : AppConstants.statusInvalid.withValues(alpha: 0.1);
    final Color badgeText =
        isEntry ? AppConstants.primaryColor : AppConstants.statusInvalid;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Container(
              width: 4,
              height: 80,
              decoration: BoxDecoration(
                  color: stripColor,
                  borderRadius: const BorderRadius.horizontal(
                      left: Radius.circular(12)))),
          const SizedBox(width: 12),
          CircleAvatar(
            backgroundImage:
                log['img'] != null ? NetworkImage(log['img']) : null,
            child: log['img'] == null ? const Icon(Icons.person) : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(log['name'],
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                Text('ID: ${log['id']}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(height: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                      color: badgeBg, borderRadius: BorderRadius.circular(12)),
                  child: Text(log['type'],
                      style: TextStyle(
                          color: badgeText,
                          fontSize: 10,
                          fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(log['time'],
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                const Text('Main Gate',
                    style: TextStyle(fontSize: 10, color: Colors.grey)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
