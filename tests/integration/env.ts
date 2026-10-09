// Deterministic configuration for the integration suite. No real provider keys.
process.env.AUTH_SECRET ??= "integration-test-secret-integration-test-secret";
process.env.ADMIN_EMAIL = "admin@test.invalid";
process.env.ADMIN_NOTIFY_EMAIL = "staff@test.invalid";
process.env.EMAIL_PROVIDER = "log";
process.env.SITE_URL = "http://localhost:3004";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_integration";
delete process.env.STRIPE_SECRET_KEY;
