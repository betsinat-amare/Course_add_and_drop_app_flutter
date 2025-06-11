import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mockito/mockito.dart';
import 'package:course_add_and_drop/presentation/screen/all_courses_screen.dart';
import 'package:course_add_and_drop/services/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:course_add_and_drop/components/footer_component.dart';

class MockGoRouter extends Mock implements GoRouter {
  @override
  GoRouteInformationProvider get routeInformationProvider => MockGoRouteInformationProvider();
}

class MockGoRouteInformationProvider extends Mock implements GoRouteInformationProvider {}
class MockApiService extends Mock implements ApiService {}
class MockSharedPreferences extends Mock implements SharedPreferences {}

void main() {
  late MockGoRouter mockGoRouter;
  late MockApiService mockApiService;
  late MockSharedPreferences mockPrefs;

  setUp(() {
    mockGoRouter = MockGoRouter();
    mockApiService = MockApiService();
    mockPrefs = MockSharedPreferences();

    // Setup default mock behavior
    when(mockPrefs.getString('user_role')).thenReturn('Student');
  });

  Widget createWidgetUnderTest() {
    return MaterialApp(
      home: Builder(
        builder: (context) => const AllCoursesScreen(),
      ),
    );
  }

  testWidgets('AllCoursesScreen shows loading indicator initially', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('AllCoursesScreen shows search field', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pump();

    expect(find.byType(TextField), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Search for courses...'), findsOneWidget);
  });

  testWidgets('AllCoursesScreen shows back button and title', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pump();

    expect(find.byIcon(Icons.arrow_back), findsOneWidget);
    expect(find.text('Add Courses'), findsOneWidget);
  });

  testWidgets('AllCoursesScreen shows profile avatar', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pump();

    expect(find.byType(CircleAvatar), findsOneWidget);
  });

  testWidgets('Search field filters courses', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pump();

    // Enter search text
    await tester.enterText(find.byType(TextField), 'test course');
    await tester.pump();

    // Verify search field has the entered text
    expect(find.text('test course'), findsOneWidget);
  });

  testWidgets('Clear button appears when search field has text', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pump();

    // Enter search text
    await tester.enterText(find.byType(TextField), 'test');
    await tester.pump();

    // Verify clear button appears
    expect(find.byIcon(Icons.clear), findsOneWidget);
  });

  testWidgets('Footer component is present', (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pump();

    expect(find.byType(FooterComponent), findsOneWidget);
  });

  testWidgets('Course card shows all required information', (WidgetTester tester) async {
    // Mock API response
    when(mockApiService.getCourses()).thenAnswer((_) async => [
      {
        'id': 1,
        'title': 'Test Course',
        'code': 'TEST101',
        'description': 'Test Description',
        'credit_hours': 3
      }
    ]);

    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Verify course information is displayed
    expect(find.text('Test Course'), findsOneWidget);
    expect(find.text('TEST101'), findsOneWidget);
    expect(find.text('Test Description'), findsOneWidget);
    expect(find.text('Credit Hours: 3'), findsOneWidget);
  });

  testWidgets('Add course button is present', (WidgetTester tester) async {
    // Mock API response
    when(mockApiService.getCourses()).thenAnswer((_) async => [
      {
        'id': 1,
        'title': 'Test Course',
        'code': 'TEST101',
        'description': 'Test Description',
        'credit_hours': 3
      }
    ]);

    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    expect(find.text('Add now'), findsOneWidget);
  });

  testWidgets('Edit and delete buttons are present for admin', (WidgetTester tester) async {
    // Mock API response and admin role
    when(mockApiService.getCourses()).thenAnswer((_) async => [
      {
        'id': 1,
        'title': 'Test Course',
        'code': 'TEST101',
        'description': 'Test Description',
        'credit_hours': 3
      }
    ]);
    when(mockPrefs.getString('user_role')).thenReturn('Registrar');

    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.edit), findsOneWidget);
    expect(find.byIcon(Icons.delete), findsOneWidget);
  });

  testWidgets('No courses message is shown when list is empty', (WidgetTester tester) async {
    // Mock empty API response
    when(mockApiService.getCourses()).thenAnswer((_) async => []);

    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    expect(find.text('No courses found.'), findsOneWidget);
  });
} 