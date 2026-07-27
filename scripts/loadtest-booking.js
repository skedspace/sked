// Load test: Booking creation endpoint
//
// Usage:
//   k6 run -e BASE_URL=https://slotly.app -e ORG_SLUG=test-org -e SERVICE_ID=... scripts/loadtest-booking.js
//
// This simulates N concurrent users trying to book the same slot.
// Expect: exactly 1 success, N-1 "slot taken" errors.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL ?? "http://localhost:3000";
const ORG_SLUG = __ENV.ORG_SLUG ?? "demo-pickleball";
const SERVICE_ID = __ENV.SERVICE_ID ?? "00000000-0000-0000-0000-000000000001";

const bookingFailureRate = new Rate("booking_failures");

export const options = {
  stages: [
    { duration: "5s", target: 5 },   // ramp up to 5 concurrent users
    { duration: "10s", target: 10 },  // ramp to 10
    { duration: "10s", target: 20 },  // ramp to 20
    { duration: "10s", target: 0 },   // ramp down
  ],
  thresholds: {
    booking_failures: ["rate<0.95"], // most should succeed or get proper "slot taken"
    http_req_duration: ["p(95)<5000"], // 95% under 5s
  },
};

export default function () {
  // 1. Fetch available slots
  const today = new Date().toISOString().split("T")[0];
  const slotsRes = http.get(
    `${BASE_URL}/api/slots?slug=${ORG_SLUG}&service=${SERVICE_ID}&date=${today}`,
  );

  check(slotsRes, {
    "slots response is 200": (r) => r.status === 200,
  });

  const slots = JSON.parse(slotsRes.body || "[]");
  if (slots.length === 0) {
    sleep(1);
    return;
  }

  // Pick the first available slot
  const slot = slots[0];

  // 2. Attempt to book it
  const payload = JSON.stringify({
    org_slug: ORG_SLUG,
    service_id: SERVICE_ID,
    resource_id: slot.resource_id,
    start_time: slot.start_time,
    end_time: slot.end_time,
    name: `Load Tester ${__VU}`,
    email: `loadtest${__VU}@example.com`,
    idempotency_key: `loadtest-${__VU}-${Date.now()}`,
  });

  const bookRes = http.post(`${BASE_URL}/api/book`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  const success = check(bookRes, {
    "booking returned 200 or 409": (r) => r.status === 200 || r.status === 409,
  });

  if (!success || bookRes.status === 409) {
    bookingFailureRate.add(1);
  }

  sleep(1);
}
