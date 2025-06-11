import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:course_add_and_drop/presentation/screen/signUp_screen.dart';
import 'package:mockito/mockito.dart';
import 'package:course_add_and_drop/services/api_service.dart';

class MockGoRouter extends Mock implements GoRouter {
  @override
  GoRouteInformationProvider get routeInformationProvider => MockGoRouteInformationProvider();
}

class MockGoRouteInformationProvider extends Mock implements GoRouteInformationProvider {}
class MockApiService extends Mock implements ApiService {}

void main() {
  late MockGoRouter mockGoRouter;
  late MockApiService mockApiService;

  setUp(() {
    mockGoRouter = MockGoRouter();
    mockApiService = MockApiService();
  });

  Widget createWidgetUnderTest() {
    return MaterialApp(
      home: Builder(
        builder: (context) => const SignUpScreen(),
      ),
    );
  }

  testWidgets('SignUp screen shows all required fields', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    expect(find.text('Create Account'), findsOneWidget);
    expect(find.text('Create your course with ease'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(5)); // Full name, email, password, confirm password, ID
    expect(find.text('Sign Up'), findsOneWidget);
  });

  testWidgets('SignUp form validation works correctly', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Try to sign up without entering any data
    await tester.tap(find.text('Sign Up'));
    await tester.pumpAndSettle();

    expect(find.text('Enter full name'), findsOneWidget);
    expect(find.text('Enter email'), findsOneWidget);
    expect(find.text('Enter password'), findsOneWidget);
    expect(find.text('Enter ID'), findsOneWidget);
  });

  testWidgets('Password validation works', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Find password fields
    final passwordFields = find.byType(TextFormField);
    await tester.enterText(passwordFields.at(2), 'password123');
    await tester.enterText(passwordFields.at(3), 'password456');
    await tester.pumpAndSettle();

    await tester.tap(find.text('Sign Up'));
    await tester.pumpAndSettle();

    expect(find.text('Passwords do not match'), findsOneWidget);
  });

  testWidgets('Navigation to login works', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Find and tap the login link
    final loginLink = find.text('Already have an account?');
    expect(loginLink, findsOneWidget);
    await tester.tap(loginLink);
    await tester.pumpAndSettle();

    // Verify navigation
    verify(mockGoRouter.go('/login')).called(1);
  });
} 