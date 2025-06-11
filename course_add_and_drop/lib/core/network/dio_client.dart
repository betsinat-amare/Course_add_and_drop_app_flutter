import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DioClient {
  static Dio get instance {
    final dio = Dio()
      ..options.baseUrl = getBaseUrl()
      ..options.connectTimeout = const Duration(seconds: 30)
      ..options.receiveTimeout = const Duration(seconds: 30)
      ..options.headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

    // Add logging interceptor for debugging
    dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
    ));

    // Add token interceptor
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('jwt_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        if (e.response?.statusCode == 401) {
          // Token expired or invalid
          final prefs = await SharedPreferences.getInstance();
          await prefs.clear();
          // You might want to add navigation logic here to redirect to login
        }
        return handler.next(e);
      },
    ));

    return dio;
  }

  static String getBaseUrl() {
    if (kIsWeb) {
      return 'http://localhost:5000/api';
    }
    
    // For mobile platforms, use the Android emulator address
    // You can change this to your actual API endpoint
    return 'http://10.0.2.2:5000/api';
  }
}