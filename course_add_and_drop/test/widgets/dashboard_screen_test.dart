import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:course_add_and_drop/presentation/screen/dashboard_screen.dart';
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
        builder: (context) => const UserDashboardScreen(),
      ),
    );
  }

  testWidgets('Dashboard shows correct elements for student', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Verify basic dashboard elements
    expect(find.byType(AppBar), findsOneWidget);
    expect(find.byType(Drawer), findsOneWidget);
  });

  testWidgets('Navigation drawer works', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Open drawer
    await tester.tap(find.byIcon(Icons.menu));
    await tester.pumpAndSettle();

    // Verify drawer items
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
    expect(find.text('Logout'), findsOneWidget);
  });

  testWidgets('Profile navigation works', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Open drawer
    await tester.tap(find.byIcon(Icons.menu));
    await tester.pumpAndSettle();

    // Navigate to profile
    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    verify(mockGoRouter.go('/edit-account')).called(1);
  });

  testWidgets('Logout works', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Open drawer
    await tester.tap(find.byIcon(Icons.menu));
    await tester.pumpAndSettle();

    // Tap logout
    await tester.tap(find.text('Logout'));
    await tester.pumpAndSettle();

    verify(mockGoRouter.go('/home')).called(1);
  });
} 