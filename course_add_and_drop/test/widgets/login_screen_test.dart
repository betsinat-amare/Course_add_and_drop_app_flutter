import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:course_add_and_drop/presentation/screen/login_screen.dart';
import 'package:mockito/mockito.dart';
import 'package:course_add_and_drop/services/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MockGoRouter extends Mock implements GoRouter {}
class MockApiService extends Mock implements ApiService {}

void main() {
  late MockGoRouter mockGoRouter;
  late MockApiService mockApiService;

  setUp(() {
    mockGoRouter = MockGoRouter();
    mockApiService = MockApiService();
  });

  Widget createWidgetUnderTest() {
    return MaterialApp.router(
      routerConfig: mockGoRouter,
      builder: (context, child) => child!,
    );
  }

  testWidgets('Login screen shows all required fields and buttons', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    expect(find.text('Access Account'), findsOneWidget);
    expect(find.text('Access your course with ease'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
    expect(find.text('Forgot Password?'), findsOneWidget);
    expect(find.text('Log In'), findsOneWidget);
  });

  testWidgets('Login form validation works', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Try to login without entering credentials
    await tester.tap(find.text('Log In'));
    await tester.pumpAndSettle();

    expect(find.text('Enter username'), findsOneWidget);
    expect(find.text('Enter password'), findsOneWidget);
  });

  testWidgets('Password visibility toggle works', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Find the password field and enter text
    final passwordField = find.byType(TextFormField).last;
    await tester.enterText(passwordField, 'testpassword');
    
    // Find and tap the visibility toggle
    final visibilityButton = find.byIcon(Icons.visibility);
    await tester.tap(visibilityButton);
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.visibility_off), findsOneWidget);
  });

  testWidgets('Navigation to forgot password works', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Tap the forgot password button
    await tester.tap(find.text('Forgot Password?'));
    await tester.pumpAndSettle();

    verify(mockGoRouter.go('/forgot-password')).called(1);
  });
} 