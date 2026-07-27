// Load test: Public page rendering
//
// Usage:
//   k6 run -e BASE_URL=https://slotly.app -e ORG_SLUG=test-org scripts/loadtest-public-page.js
//
// This simulates high traffic to the public booking page.
// Measures response time and verifies the page renders correctly.

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL ?? "http://localhost:3000";
const ORG_SLUG = __ENV.ORG_SLUG ?? "demo-pickleball";

export const options = {
  stages: [
    { duration: "10s", target: 50 },   // ramp to 50 concurrent users
    { duration: "30s", target: 100 },  // sustain at 100
    { duration: "10s", target: 200 },  // spike to 200
    { duration: "10s", target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"], // 95% under 3s
    http_req_failed: ["rate<0.01"],     // less than 1% errors
  },
};

export default function () {
  // Visit the public page
  const res = http.get(`${BASE_URL}/p/${ORG_SLUG}`);

  check(res, {
    "page loads successfully": (r) => r.status === 200,
    "page contains business name": (r) => r.body && r.body.includes(ORG_SLUG),
    "response under 3s": (r) => r.timings.duration < 3000,
  });

  sleep(0.5);
}
