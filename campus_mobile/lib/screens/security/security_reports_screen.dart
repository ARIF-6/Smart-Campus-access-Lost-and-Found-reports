import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';

class SecurityReportsScreen extends StatefulWidget {
  const SecurityReportsScreen({super.key});
  @override
  State<SecurityReportsScreen> createState() => _SecurityReportsScreenState();
}

class _SecurityReportsScreenState extends State<SecurityReportsScreen> with SingleTickerProviderStateMixin {
  final ApiService _api = ApiService();
  late TabController _tabs;
  Map<String, dynamic>? _report;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _fetch();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final res = await _api.get('/security/reports');
      if (mounted) setState(() { _report = res.data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Security Reports'),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [IconButton(onPressed: _fetch, icon: const Icon(Icons.refresh))],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppConstants.primaryColor,
          unselectedLabelColor: Colors.grey,
          indicatorColor: AppConstants.primaryColor,
          tabs: const [Tab(text: 'Today'), Tab(text: 'This Week'), Tab(text: 'This Month')],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _report == null
              ? const Center(child: Text('Failed to load report'))
              : TabBarView(
                  controller: _tabs,
                  children: [
                    _buildReport(_report!['daily'] ?? {}, 'Today'),
                    _buildReport(_report!['weekly'] ?? {}, 'This Week'),
                    _buildReport(_report!['monthly'] ?? {}, 'This Month'),
                  ],
                ),
    );
  }

  Widget _buildReport(Map<String, dynamic> data, String period) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$period Summary', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),

        // Live count card (only for daily)
        if (period == 'Today' && data['currentlyInside'] != null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF1A73E8), Color(0xFF1D4ED8)]),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [BoxShadow(color: AppConstants.primaryColor.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 8))],
            ),
            child: Column(children: [
              const Text('CURRENTLY ON CAMPUS', style: TextStyle(color: Colors.white70, fontSize: 12, letterSpacing: 1.5)),
              const SizedBox(height: 8),
              Text(
                '${data['currentlyInside']}',
                style: const TextStyle(color: Colors.white, fontSize: 56, fontWeight: FontWeight.bold),
              ),
              const Text('Students Inside', style: TextStyle(color: Colors.white70)),
            ]),
          ),

        // Stats grid
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.25,
          children: [
            _statCard('Entries', '${data['entries'] ?? 0}', Icons.login, Colors.green),
            _statCard('Exits', '${data['exits'] ?? 0}', Icons.logout, AppConstants.statusInvalid),
            _statCard('Incidents', '${data['incidents'] ?? 0}', Icons.warning_amber_rounded, Colors.orange),
            if (period == 'Today')
              _statCard('Visitors', '${data['visitors'] ?? 0}', Icons.person_add, Colors.teal)
            else
              _statCard('Shifts Worked', '${data['shifts'] ?? 0}', Icons.work, AppConstants.primaryColor),
          ],
        ),

        const SizedBox(height: 24),

        // Ratio bar
        if ((data['entries'] ?? 0) > 0 || (data['exits'] ?? 0) > 0) ...[
          const Text('Entry / Exit Ratio', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          _ratioBar(data['entries'] ?? 0, data['exits'] ?? 0),
          const SizedBox(height: 24),
        ],

        // Incident severity breakdown
        const Text('Incident Overview', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade100),
          ),
          child: Row(children: [
            Icon(Icons.bar_chart, color: Colors.orange.shade700),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Total Incidents: ${data['incidents'] ?? 0}', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(
                data['incidents'] == 0 ? '✅ No incidents reported' : '⚠️ Review incident logs',
                style: TextStyle(
                  color: data['incidents'] == 0 ? Colors.green : Colors.orange,
                  fontSize: 13,
                ),
              ),
            ])),
          ]),
        ),
      ]),
    );
  }

  Widget _statCard(String label, String val, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 18),
            ),
          ]),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(val, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
              const SizedBox(height: 2),
              Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _ratioBar(int entries, int exits) {
    final total = entries + exits;
    final eRatio = total > 0 ? entries / total : 0.5;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Row(children: [
          Expanded(
            flex: (eRatio * 100).toInt(),
            child: Container(height: 24, color: Colors.green.shade500,
              child: eRatio > 0.2 ? Center(child: Text('$entries IN', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold))) : const SizedBox()),
          ),
          Expanded(
            flex: ((1 - eRatio) * 100).toInt(),
            child: Container(height: 24, color: AppConstants.statusInvalid,
              child: (1 - eRatio) > 0.2 ? Center(child: Text('$exits OUT', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold))) : const SizedBox()),
          ),
        ]),
      ),
    ]);
  }
}
