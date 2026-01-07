# Notification System Implementation

This document describes the notification system implemented for the EcoGuardians energy trading platform.

## Overview

The notification system provides real-time alerts to users about:
1. **Trade notifications**: When trades are created or executed
2. **Energy alerts**: When energy levels are low or high compared to daily consumption

## Components

### 1. Notification Model (`lib/models/notification.dart`)
- Defines the data structure for notifications
- Supports different notification types: tradeCreated, tradeExecuted, energyLow, energyHigh, info
- Includes metadata for additional context

### 2. Notification Service (`lib/services/notification_service.dart`)
- Manages the notification state using ChangeNotifier
- Provides methods to:
  - Add notifications
  - Mark notifications as read
  - Remove notifications
  - Specialized methods for trade and energy notifications

### 3. Notification Screen (`lib/screens/notification_screen.dart`)
- Full-screen view displaying all notifications
- Shows unread count badge
- Allows marking all as read
- Dismissible notifications
- Time-based formatting (e.g., "5 min ago", "1 hour ago")

### 4. Profile Screen Updates (`lib/screens/profile_screen.dart`)
- Added daily consumption configuration field
- Users can update their daily energy consumption
- This value is used to trigger energy alerts

### 5. Integration Points

#### Main App (`lib/main.dart`)
- Added `MultiProvider` to provide both `EnergyDataProvider` and `NotificationService`
- Connected notification service to energy provider on login
- Added navigation route for notification screen

#### Dashboard (`lib/screens/dashboard_screen.dart`)
- Updated notification bell icon with unread count badge
- Removed old hardcoded notification panel
- Added navigation to notification screen

#### Energy Data Provider (`lib/providers/energy_data_provider.dart`)
- Added notification service reference
- Triggers notifications when:
  - Trade is created (shows which factory and trade details)
  - Trade is executed (shows completion details)
  - Energy is below daily consumption (warning alert)
  - Energy is above daily consumption by 50% (surplus alert)

#### Login/Registration (`lib/screens/login_screen.dart`)
- Added daily consumption field in registration form
- Default value: 100 kWh
- Saved to database during registration

## Usage

### For Users

1. **View Notifications**: Click the bell icon in the app bar (shows unread count badge)
2. **Configure Daily Consumption**: 
   - Go to Profile → Energy Balance section
   - Click "Update" button next to Daily Consumption
   - Enter your expected daily energy usage
3. **Receive Alerts**:
   - Low energy: "⚠️ Your energy (X kWh) is below daily consumption (Y kWh)"
   - Surplus: "✅ You have surplus energy: X kWh above daily consumption"
   - Trade created: "New sell/buy trade created with [Factory]"
   - Trade executed: "Trade executed with [Factory]"

### For Developers

#### Adding a New Notification Type

1. Add enum value to `NotificationType` in `notification.dart`
2. Add handler method in `notification_service.dart`
3. Call the method from appropriate location in the app

Example:
```dart
// In notification_service.dart
void notifyCustomEvent({
  required String title,
  required String message,
}) {
  final notification = AppNotification(
    id: 'custom-${DateTime.now().millisecondsSinceEpoch}',
    type: NotificationType.info,
    title: title,
    message: message,
    timestamp: DateTime.now(),
  );
  addNotification(notification);
}

// Usage in your code
final notificationService = Provider.of<NotificationService>(context, listen: false);
notificationService.notifyCustomEvent(
  title: 'Custom Event',
  message: 'Something happened!',
);
```

## Backend Integration

The system integrates with the existing backend API:
- `GET /api/factory/:factoryId` - Fetches daily consumption and available energy
- `PUT /api/factory/:factoryId/daily-consumption` - Updates daily consumption
- `POST /api/trade/create` - Creates trade (triggers notification)
- `POST /api/trade/execute` - Executes trade (triggers notification)

## Energy Alert Logic

Alerts are triggered when:
1. **Low Energy Alert**: `availableEnergy < dailyConsumption`
   - User should consider buying energy instead of selling
2. **Surplus Alert**: `availableEnergy > dailyConsumption * 1.5`
   - User has 50% or more surplus energy
   - Good time to sell excess energy

## Future Enhancements

Potential improvements:
1. Push notifications using Firebase Cloud Messaging
2. Notification preferences (enable/disable specific types)
3. Notification sound/vibration
4. Scheduled notifications (daily summary)
5. In-app notification badges on specific screens
6. Notification history persistence (save to local storage)
7. Deep linking from notifications to specific screens

## Testing

To test the notification system:
1. Register a new factory with daily consumption
2. Create a trade - observe trade created notification
3. Execute a trade - observe trade executed notification
4. Update available energy below daily consumption - observe low energy alert
5. Update available energy above daily consumption - observe surplus alert
6. View all notifications in the notification screen
7. Mark notifications as read
8. Dismiss individual notifications

## Notes

- Notifications are stored in memory and will be cleared when the app restarts
- The notification service is connected to the energy provider on login
- Energy status is checked when factory data is fetched
- Trade notifications include factory name, amount, and price details
