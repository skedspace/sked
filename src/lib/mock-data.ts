/**
 * Local-dev mock data provider.
 *
 * When Supabase is empty in development, returns realistic sample data
 * so every dashboard page is navigable and visually reviewable.
 *
 * Data is stored in sessionStorage so additions persist across
 * page navigations and refreshes within the same browser tab.
 */

type Ctor<T> = { new (...args: any[]): T } | (() => T);

const STORAGE_KEY = "sked_mock_data_v3";

// ── Helpers ──

function uid() {
  return Math.random().toString(36).substring(2, 10);
}

function fmtRange(hour: number, min: number, dur: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  // shift some into the past/future for variety
  const dayOff = Math.random() > 0.6 ? Math.floor(Math.random() * 5) - 2 : 0;
  d.setDate(d.getDate() + dayOff);
  const start = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    hour,
    min,
    0,
  );
  const end = new Date(start.getTime() + dur * 60000);
  const f = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}:00+08`;
  return `[${f(start)},${f(end)})`;
}

const CUSTOMERS_DB = [
  { name: "Marie Cruz", email: "marie@example.com", phone: "0917 555 1234" },
  { name: "Juan dela Cruz", email: "juan@example.com", phone: "0928 765 4321" },
  { name: "Alex Reyes", email: "alex@example.com", phone: "0905 111 2222" },
  { name: "Sofia Lim", email: "sofia@example.com", phone: "0933 444 5678" },
  { name: "Marco Santos", email: "marco@example.com", phone: "0919 888 9999" },
  { name: "Tina Romero", email: "tina@example.com", phone: "0922 333 4444" },
  { name: "Ben Torres", email: "ben@example.com", phone: "0906 777 8888" },
  { name: "Liza Morales", email: "liza@example.com", phone: "0912 345 6789" },
  {
    name: "Carla Villanueva",
    email: "carla@example.com",
    phone: "0930 111 2233",
  },
  { name: "Ding Mercado", email: "ding@example.com", phone: "0917 555 9876" },
];

const SERVICES_DB = [
  { name: "Court Rental", dur: 60, price: 150000 },
  { name: "Private Coaching", dur: 60, price: 200000 },
  { name: "Social Play", dur: 90, price: 80000 },
  { name: "Open Play", dur: 120, price: 100000 },
  { name: "Tournament Match", dur: 120, price: 250000 },
];

const RESOURCES_DB = ["Court 1", "Court 2", "Court 3", "Court 4"];

const STATUSES = [
  "confirmed",
  "confirmed",
  "confirmed",
  "held",
  "pending",
  "completed",
] as const;

// ── Mock data shape ──

type MockCustomersShape = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  no_show_count: number;
  created_at: string;
};

type MockBookingShape = {
  id: string;
  time_range: string;
  status: string;
  price_cents: number;
  source: string;
  created_at: string;
  customers: {
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  services: { name: string; duration_min: number } | null;
  resources: { name: string } | null;
};

export type MockBooking = MockBookingShape;

type MockPaymentShape = {
  id: string;
  booking_id: string;
  amount_cents: number;
  status: string;
  payment_method: string;
  created_at: string;
};

type MockDataStore = {
  customers: MockCustomersShape[];
  bookings: MockBookingShape[];
  payments: MockPaymentShape[];
};

// ── Factory ──

function createCustomer(idx: number): MockCustomersShape {
  const c = CUSTOMERS_DB[idx % CUSTOMERS_DB.length] ?? CUSTOMERS_DB[0];
  if (!c) throw new Error("Mock customer fixture is empty");
  return {
    id: `cust_${uid()}`,
    name: c.name,
    email: c.email,
    phone: c.phone,
    no_show_count: Math.random() > 0.85 ? 1 : 0,
    created_at: new Date(
      Date.now() - Math.random() * 90 * 86400000,
    ).toISOString(),
  };
}

function createBooking(idx: number): MockBookingShape {
  const svc = SERVICES_DB[idx % SERVICES_DB.length] ?? SERVICES_DB[0];
  const cust = CUSTOMERS_DB[idx % CUSTOMERS_DB.length] ?? CUSTOMERS_DB[0];
  const res = RESOURCES_DB[idx % RESOURCES_DB.length] ?? RESOURCES_DB[0];
  if (!svc || !cust || !res) throw new Error("Mock booking fixtures are empty");
  const hour = 8 + (idx % 10);
  const status = STATUSES[idx % STATUSES.length] ?? "confirmed";

  return {
    id: `bkg_${uid()}`,
    time_range: fmtRange(hour, 0, svc.dur),
    status,
    price_cents: svc.price,
    source: Math.random() > 0.8 ? "walk-in" : "online",
    created_at: new Date(
      Date.now() - Math.random() * 14 * 86400000,
    ).toISOString(),
    customers: { name: cust.name, email: cust.email, phone: cust.phone },
    services: { name: svc.name, duration_min: svc.dur },
    resources: { name: res },
  };
}

function createPayment(b: MockBookingShape): MockPaymentShape {
  return {
    id: `pay_${uid()}`,
    booking_id: b.id,
    amount_cents: b.price_cents,
    status: Math.random() > 0.2 ? "succeeded" : "pending",
    payment_method: Math.random() > 0.5 ? "card" : "gcash",
    created_at: b.created_at,
  };
}

function seedData(): MockDataStore {
  // 12 customers with staggered dates
  const customers = Array.from({ length: 10 }, (_, i) => createCustomer(i));

  // 24 bookings spread across days/times
  const bookings = Array.from({ length: 24 }, (_, i) => createBooking(i));

  // payment for each booking
  const payments = bookings.map(createPayment);

  return { customers, bookings, payments };
}

// ── Load / Save ──

function load(): MockDataStore {
  if (typeof window === "undefined") return seedData();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.bookings?.length) return parsed;
    }
  } catch {}
  const data = seedData();
  save(data);
  return data;
}

function save(data: MockDataStore) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ── Public API ──

export function getMockCustomers(): MockCustomersShape[] {
  return load().customers;
}

export function getMockBookings(): MockBookingShape[] {
  return load().bookings;
}

export function getMockPayments(): MockPaymentShape[] {
  return load().payments;
}

export function addMockBooking(): MockBookingShape {
  const data = load();
  const b = createBooking(data.bookings.length);
  data.bookings.push(b);
  data.payments.push(createPayment(b));
  save(data);
  return b;
}

export function updateMockBookingStatus(
  bookingId: string,
  newStatus: string,
): boolean {
  const data = load();
  const b = data.bookings.find((x) => x.id === bookingId);
  if (b) {
    b.status = newStatus;
    save(data);
    return true;
  }
  return false;
}

export function addMockBookingFromForm(params: {
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  resourceName: string;
  serviceName: string;
  durationMin: number;
  priceCents: number;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
}): MockBookingShape {
  const data = load();
  const b: MockBookingShape = {
    id: `bkg_${uid()}`,
    time_range: `[${params.startTime},${params.endTime})`,
    status: params.status,
    price_cents: params.priceCents,
    source: params.source,
    created_at: new Date().toISOString(),
    customers: {
      name: params.customerName,
      email: params.customerEmail || null,
      phone: params.customerPhone || null,
    },
    services: {
      name: params.serviceName,
      duration_min: params.durationMin,
    },
    resources: {
      name: params.resourceName,
    },
  };
  data.bookings.push(b);
  data.payments.push(createPayment(b));
  save(data);
  return b;
}

export function resetMockData() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
  save(seedData());
}

export function getMockStats() {
  const data = load();
  return {
    total: data.bookings.length,
    confirmed: data.bookings.filter((b) => b.status === "confirmed").length,
    completed: data.bookings.filter((b) => b.status === "completed").length,
    cancelled: data.bookings.filter((b) => b.status === "cancelled").length,
    noShow: data.bookings.filter((b) => b.status === "no_show").length,
  };
}
