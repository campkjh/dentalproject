# Native push deployment

Firebase project: `mydoc-d2989` (Mydoc). Android application ID and iOS bundle ID: `kr.co.mydoc`.

## Server

1. Apply `supabase/migrations/0025_native_push.sql` before deploying these routes. It creates private device registrations, notification preferences and a durable notification queue. Existing notifications are not enqueued.
2. Production Vercel project `dentalproject` requires `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` and `CRON_SECRET`. Private keys and cron secrets must remain server-only secrets. Never commit a service-account JSON file.
3. Notification writes use `writeNotifications`, which persists the inbox item and schedules immediate delivery after the response. A database trigger queues every new notification, including writes outside these routes. `/api/cron/push` retries pending deliveries every five minutes and requires the exact cron bearer secret.
4. A lease prevents concurrent workers from claiming one queue item. Retryable failures use backoff, expired FCM tokens are removed, and old/read/disabled notifications are skipped. Notifications expire after 24 hours; failed items stop after six attempts.
5. Lock-screen text is generic. Notification IDs and internal navigation links are sent as data; medical/message bodies stay in the app.

## Native apps

- Android: Firebase Messaging and Android 13 notification permission, activity/quiet channels, refreshed FCM tokens, foreground display and notification-tap navigation. Version `1.0.5` (6).
- iOS: Firebase Messaging, UIApplicationDelegate adaptor, APNs token mapping, notification permission, foreground presentation and pending cold-start tap routing. Version `1.0.2` (3). Apple team: `6F446Q2JCC`.
- Public Firebase client config files belong in their native app projects. Server service-account keys and APNs private keys do not.
- Upload an APNs authentication key for the correct Apple team in Firebase Project Settings → Cloud Messaging before testing iOS delivery.
- The web bridge registers the token for the authenticated member. Sign-out removes the server registration before ending the session and invalidates the native token. A failed server removal does not silently leave a shared device connected.

## Verification

Automated coverage includes recipient/deduplication/privacy rules, live comment counts, consultation filters, notification preferences, Korean quiet hours, external-link rejection, FCM failure handling and registration/sign-out ordering. Web, Android debug and iOS simulator builds must pass.

A successful FCM `validateOnly` request verifies server authentication without sending an alert. Complete the release check on a real device with the new app build: allow OS notifications, sign in, verify a device row for that member, trigger a comment/reply or consultation message from an authorized second test account, and verify foreground/background/tap behavior. Also verify sign-out/account switching and disabled notification categories. Do not send test alerts to unrelated real members.
