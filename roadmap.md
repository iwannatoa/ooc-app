# Roadmap

## Mobile Support (Deferred)

- In the current phase, focus on desktop platforms (Windows/Linux) for capability completion and stability validation.
- Mobile platforms (iOS/Android) are out of scope for the current iteration and deferred to a future milestone.

## Follow-up To-dos (Mobile)

- Evaluate the cross-platform technical approach (keep the existing frontend stack or adopt a mobile-specific container/runtime).
- Design the communication model between mobile clients and backend services (authentication, streaming, retry under weak networks, and reconnection).
- Define the provider capability matrix for mobile (local models vs cloud models).
- Plan secure secret storage for mobile (Keychain/Keystore) and security audit requirements.
- Establish CI/CD, signing, and release pipelines for iOS/Android.
- Add mobile-specific testing coverage (performance, battery usage, foreground/background transitions, and network switching).
