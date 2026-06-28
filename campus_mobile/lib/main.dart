import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/constants.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/splash_screen.dart';
import 'screens/auth/login_screen.dart';

import 'providers/notification_provider.dart';
import 'providers/shift_provider.dart';
import 'providers/class_issue_provider.dart';
import 'providers/campus_issue_provider.dart';

import 'screens/security/security_main_screen.dart';
import 'screens/cleaner/cleaner_dashboard.dart';
import 'screens/student/student_main_screen.dart';
import 'screens/admin/admin_dashboard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait on mobile
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Set status-bar style to transparent so the navy header bleeds through
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));

  final originalOnError = FlutterError.onError;
  FlutterError.onError = (FlutterErrorDetails details) {
    final message = details.exception.toString();
    if (message.contains('isDisposed') ||
        message.contains('EngineFlutterView') ||
        message.contains('Trying to render a disposed')) {
      debugPrint('[Suppressed] EngineFlutterView disposed error during navigation.');
      return;
    }
    originalOnError?.call(details);
  };

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => ShiftProvider()),
        ChangeNotifierProvider(create: (_) => ClassIssueProvider()),
        ChangeNotifierProvider(create: (_) => CampusIssueProvider()),
      ],
      child: const _AppEntry(),
    ),
  );
}

class _AppEntry extends StatefulWidget {
  const _AppEntry();
  @override
  State<_AppEntry> createState() => _AppEntryState();
}

class _AppEntryState extends State<_AppEntry> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        Provider.of<AuthProvider>(context, listen: false).checkAuthStatus();
      }
    });
  }

  @override
  Widget build(BuildContext context) => const CampusMobileApp();
}

class CampusMobileApp extends StatelessWidget {
  const CampusMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return MaterialApp(
      title: 'Smart Campus',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: GoogleFonts.inter().fontFamily,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppConstants.primaryNavy,
          brightness: Brightness.light,
        ).copyWith(
          primary: AppConstants.primaryNavy,
          secondary: AppConstants.midBlue,
          surface: AppConstants.cardColor,
        ),
        scaffoldBackgroundColor: AppConstants.backgroundColor,

        // Cards
        cardTheme: CardThemeData(
          color: AppConstants.cardColor,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
        ),

        // Inputs — clean & minimal
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFFF0F4FC),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: AppConstants.borderColor, width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppConstants.midBlue, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          hintStyle: const TextStyle(
            color: AppConstants.textSecondary,
            fontSize: 14,
            fontWeight: FontWeight.w400,
          ),
        ),

        // Elevated buttons — navy
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppConstants.primaryNavy,
            foregroundColor: Colors.white,
            elevation: 0,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            textStyle: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
            ),
          ),
        ),

        // AppBar
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 0,
          centerTitle: true,
          iconTheme: IconThemeData(color: Colors.black),
          actionsIconTheme: IconThemeData(color: Colors.black),
          systemOverlayStyle: SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.dark,
          ),
        ),
      ),
      home: auth.isAuthenticated
          ? _getRoleHome(auth.role)
          : const SplashScreen(),
      routes: {
        '/splash': (context) => const SplashScreen(),
        '/login':  (context) => const LoginScreen(),
      },
    );
  }

  Widget _getRoleHome(String? role) {
    switch (role) {
      case AppConstants.roleSecurity: return const SecurityMainScreen();
      case AppConstants.roleCleaner:  return const CleanerDashboard();
      case AppConstants.roleStudent:  return const StudentMainScreen();
      case AppConstants.roleAdmin:
      case AppConstants.roleStaff:    return const AdminDashboard();
      default:                        return const LoginScreen();
    }
  }
}
