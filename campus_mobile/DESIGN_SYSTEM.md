# Smart Campus Mobile App - New UI Design System

## 🎨 Design System Overview

A modern, clean, and professional Material Design 3 implementation for the Smart Campus mobile application.

---

## 📦 File Structure

```
campus_mobile/lib/
├── core/
│   ├── constants.dart                    # Color palette & app constants
│   └── widgets/
│       ├── widgets.dart                  # Barrel export file
│       ├── primary_button.dart           # Reusable primary button
│       ├── secondary_button.dart         # Reusable outlined button
│       └── custom_input_field.dart       # Reusable input field
├── screens/
│   └── auth/
│       ├── splash_screen.dart            # Animated splash screen
│       └── login_screen.dart             # Redesigned login page
└── main.dart                             # App entry point with theme
```

---

## 🎨 Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Primary** | `#2563EB` | Main brand, buttons, headers, active states |
| **Secondary** | `#10B981` | Success states, secondary actions |
| **Accent** | `#F59E0B` | Highlights, warnings, attention |

### Surface Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Background** | `#F9FAFB` | App background (light gray) |
| **Card** | `#FFFFFF` | Cards, containers, dialogs |

### Text Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Text Primary** | `#111827` | Headings, important text |
| **Text Secondary** | `#6B7280` | Subtitles, descriptions |

### Status Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Error** | `#EF4444` | Error states, alerts |
| **Success** | `#10B981` | Success, approved |

---

## 🔤 Typography

### Font Family
- **Inter** (via `google_fonts` package)

### Text Hierarchy
| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| Display | 32px | Bold | Splash screen title |
| H1 | 28px | Bold | Page titles |
| H2 | 24px | Bold | Section headers |
| H3 | 18-20px | Bold | Card titles |
| Body Large | 16px | SemiBold | Button text |
| Body | 14-15px | Regular | Main content |
| Small | 13px | Regular | Supporting text |
| Caption | 12px | Regular | Labels, hints |

---

## 📐 Spacing System

Standard spacing scale (in pixels):
- **4**: Micro spacing
- **8**: Small gaps
- **12**: Medium-small
- **16**: Standard (padding, margins)
- **20**: Medium
- **24**: Large (section padding)
- **32**: Extra large
- **40-48**: Hero sections

---

## 🎭 UI Components

### 1. Splash Screen
**Location**: `lib/screens/auth/splash_screen.dart`

**Features**:
- Gradient background (Primary Blue → Darker Blue)
- Animated logo (fade + scale with easeOutBack curve)
- App name and tagline
- Loading indicator
- Auto-navigates to login after 3 seconds

**Animations**:
- **Fade**: 0.0 → 1.0 (0-60% of animation)
- **Scale**: 0.5 → 1.0 (20-80% of animation)
- Duration: 1.5 seconds

---

### 2. Login Screen
**Location**: `lib/screens/auth/login_screen.dart`

**Layout**:
1. **Top Section** (Gradient Header):
   - App logo in white card with shadow
   - "Smart Campus" title
   - "Secure Campus Access" subtitle

2. **Form Section**:
   - Welcome message
   - Email input with validation
   - Password input with show/hide toggle
   - Forgot password link
   - Login button (full width, 52px height)
   - Info banner

**Features**:
- Card-based form container
- Soft shadows
- Rounded corners (12px inputs, 14px buttons)
- Form validation
- Loading state
- Error handling with SnackBar

---

### 3. Reusable Components

#### PrimaryButton
**Location**: `lib/core/widgets/primary_button.dart`

```dart
PrimaryButton(
  text: 'Login',
  onPressed: () {},
  isLoading: false,
  icon: Icons.login,  // optional
  width: double.infinity,
  height: 52.0,
)
```

**Properties**:
- Background: Primary Blue
- Text: White, 16px, SemiBold
- Border radius: 14px
- Height: 52px (default)
- Loading state with spinner

#### SecondaryButton
```dart
SecondaryButton(
  text: 'Cancel',
  onPressed: () {},
  icon: Icons.close,  // optional
)
```

**Properties**:
- Outlined style
- Border: Primary Blue, 1.5px
- Border radius: 14px

#### CustomInputField
**Location**: `lib/core/widgets/custom_input_field.dart`

```dart
CustomInputField(
  label: 'Email',
  hintText: 'Enter your email',
  controller: _emailController,
  keyboardType: TextInputType.emailAddress,
  prefixIcon: Icon(Icons.email_outlined),
  suffixIcon: Icon(Icons.visibility),  // optional
  obscureText: false,
  validator: (value) {
    if (value.isEmpty) return 'Required';
    return null;
  },
)
```

**Properties**:
- Label above input
- Border radius: 12px
- Focused border: Primary Blue, 2px
- Error border: Red, 1.5px
- Filled background: White
- Content padding: 16px horizontal & vertical

---

## 🎯 Theme Configuration

**Location**: `lib/main.dart`

### Global Theme Settings
```dart
ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: AppConstants.primaryColor,
    brightness: Brightness.light,
  ),
  textTheme: GoogleFonts.interTextTheme(),
  scaffoldBackgroundColor: AppConstants.backgroundColor,
)
```

### Component Themes
1. **CardTheme**:
   - Border radius: 16px
   - Elevation: 0
   - Color: White

2. **InputDecorationTheme**:
   - Border radius: 12px
   - Filled: true
   - Content padding: 16px

3. **ElevatedButtonTheme**:
   - Border radius: 14px
   - Padding: 24x16
   - Elevation: 0

---

## 🚀 Navigation Flow

```
Splash Screen (3s)
    ↓
Login Screen
    ↓
Role-based Dashboard:
  - /student → StudentMainScreen
  - /security → SecurityMainScreen
  - /cleaner → CleanerDashboard
  - /admin → AdminDashboard
```

**Routing**: Standard Navigator with named routes

---

## ✅ Form Validation

### Email Validation
- Required field
- Must contain "@"
- Error message displayed below input

### Password Validation
- Required field
- Error message displayed below input

### Error Display
- Inline error text (red)
- SnackBar for server errors
  - Floating behavior
  - Red background
  - Rounded corners (12px)
  - Margin: 16px

---

## 📱 Responsive Design

### Safe Areas
- All screens use `SafeArea` widget
- Proper handling of notches and status bars

### Layout
- Single column scrollable layout
- No overflow issues
- Flexible spacing
- Full-width buttons

### Device Support
- Works on all screen sizes
- Tested on Android emulator
- Web compatible (with baseURL adjustment)

---

## 🎨 Design Principles

1. **Consistency**: Same colors, spacing, and components throughout
2. **Clarity**: High contrast, readable text, clear hierarchy
3. **Simplicity**: Minimal design, no clutter, focus on content
4. **Feedback**: Loading states, error messages, success indicators
5. **Accessibility**: Large touch targets (48px+), readable fonts

---

## 🔧 Usage Examples

### Creating a New Screen

```dart
import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../core/widgets/widgets.dart';

class MyScreen extends StatelessWidget {
  const MyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              CustomInputField(
                label: 'Name',
                hintText: 'Enter your name',
              ),
              const SizedBox(height: 16),
              PrimaryButton(
                text: 'Submit',
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

## 📋 Checklist

✅ **Design System**
- [x] Color palette defined
- [x] Typography system
- [x] Spacing scale
- [x] Component library

✅ **Screens**
- [x] Splash screen with animations
- [x] Login screen with validation
- [x] Role-based routing

✅ **Components**
- [x] PrimaryButton
- [x] SecondaryButton
- [x] CustomInputField

✅ **Quality**
- [x] No compilation errors
- [x] Clean architecture
- [x] Reusable components
- [x] Responsive design
- [x] Proper error handling

---

## 🎯 Next Steps

To complete the app UI:
1. Apply new design system to existing dashboards
2. Update all screens to use reusable components
3. Add animations and transitions
4. Implement dark mode (optional)
5. Add accessibility features

---

## 📚 Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.5              # State management
  google_fonts: ^8.0.2          # Inter font
  # ... other dependencies
```

---

## 🎉 Summary

This design system provides:
- **Modern UI**: Material Design 3 with clean aesthetics
- **Reusable Components**: Buttons, inputs, cards
- **Consistent Design**: Unified colors, spacing, typography
- **Ready to Use**: Fully functional splash and login screens
- **Easy to Extend**: Well-structured code for future development

The app is now ready to run with the new professional design system!
