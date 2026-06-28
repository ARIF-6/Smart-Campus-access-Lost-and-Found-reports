import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:flutter/foundation.dart';
import '../core/constants.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? socket;
  bool _isConnected = false;
  bool _hasLoggedConnectError = false;

  void connect(String token) {
    if (socket != null && socket!.connected) return;

    socket = io.io(AppConstants.serverUrl, 
      io.OptionBuilder()
        .setTransports(['websocket', 'polling']) // Added polling fallback
        .setAuth({'token': token})
        .enableAutoConnect()
        .enableForceNew() // Ensure fresh connection
        .setTimeout(8000)
        .setReconnectionAttempts(3)
        .setReconnectionDelay(2500)
        .build()
    );

    socket!.onConnect((_) {
      _isConnected = true;
      _hasLoggedConnectError = false;
      debugPrint('Socket connected to server');
    });

    socket!.onDisconnect((_) {
      _isConnected = false;
      debugPrint('Socket disconnected');
    });

    socket!.onConnectError((err) {
      _isConnected = false;
      if (!_hasLoggedConnectError) {
        debugPrint('Socket connect error: $err');
        _hasLoggedConnectError = true;
      }
    });
    
    socket!.connect();
  }

  void on(String event, Function(dynamic) handler) {
    socket?.on(event, handler);
  }

  void off(String event) {
    socket?.off(event);
  }

  void emit(String event, [dynamic data]) {
    socket?.emit(event, data);
  }

  void joinRoom(String room) {
    if (_isConnected) {
      emit('join', room);
    } else {
      socket?.onConnect((_) {
        emit('join', room);
      });
    }
  }

  void disconnect() {
    socket?.off('connect');
    socket?.off('disconnect');
    socket?.off('connect_error');
    socket?.disconnect();
    socket?.dispose();
    socket = null;
    _isConnected = false;
    _hasLoggedConnectError = false;
  }

  bool get isConnected => _isConnected;
}
