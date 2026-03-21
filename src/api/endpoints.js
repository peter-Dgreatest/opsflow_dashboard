import client from './client';

// ── AUTH ──────────────────────────────────────────────────────────────────────
// The backend sets HttpOnly cookies on signin/verify-otp/refresh.
// The frontend never touches tokens directly.
export const authApi = {
  // Step 1: send credentials → backend sets cookies → returns { user }
  signin: (data) => client.post('/auth/signin', data).then(r => r.data),

  // Sign-up flow (2-step OTP)
  signup: (data) => client.post('/auth/signup', data).then(r => r.data),
  verifySignupOtp: (data) => client.post('/auth/verify-otp', data).then(r => r.data),
  resendOtp: (data) => client.post('/auth/resend-otp', data).then(r => r.data),

  // Password-reset flow (2-step OTP)
  forgotPassword: (data) => client.post('/auth/forgot-password', data).then(r => r.data),
  verifyResetOtp: (data) => client.post('/auth/verify-reset-otp', data).then(r => r.data),
  resetPassword: (data) => client.post('/auth/reset-password', data).then(r => r.data),

  // Session
  me: () => client.get('/auth/me').then(r => r.data),
  // Logout: backend clears cookies by setting them expired
  logout: () => client.post('/auth/logout', {}).then(r => r.data).catch(() => null),
  // Token refresh is handled automatically by the interceptor in client.js
  refresh: () => client.post('/auth/refresh', {}).then(r => r.data),

  // Profile & password update (authenticated)
  updateProfile: (data) => client.put('/auth/profile', data).then(r => r.data),
  updatePassword: (data) => client.put('/auth/password', data).then(r => r.data),
};

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary: (params) => client.get('/dashboard/summary', { params }).then(r => r.data),
};

// ── JOBS ──────────────────────────────────────────────────────────────────────
export const jobsApi = {
  list: (params) => client.get('/jobs', { params }).then(r => r.data),
  get: (id) => client.get(`/jobs/${id}`).then(r => r.data),
  create: (data) => client.post('/jobs', data).then(r => r.data),
  update: (id, data) => client.put(`/jobs/${id}`, data).then(r => r.data),
  delete: (id) => client.delete(`/jobs/${id}`).then(r => r.data),
};

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────
export const customersApi = {
  list: (params) => client.get('/customers', { params }).then(r => r.data),
  get: (code) => client.get(`/customers/${code}`).then(r => r.data),
  create: (data) => client.post('/customers', data).then(r => r.data),
  update: (code, data) => client.put(`/customers/${code}`, data).then(r => r.data),
  delete: (code) => client.delete(`/customers/${code}`).then(r => r.data),
};

// ── CREW ──────────────────────────────────────────────────────────────────────
export const crewApi = {
  list: (params) => client.get('/crew', { params }).then(r => r.data),
  get: (id) => client.get(`/crew/${id}`).then(r => r.data),
  create: (data) => client.post('/crew', data).then(r => r.data),
  update: (id, data) => client.put(`/crew/${id}`, data).then(r => r.data),
  delete: (id) => client.delete(`/crew/${id}`).then(r => r.data),
};

// ── CREW PAYMENTS ─────────────────────────────────────────────────────────────
export const crewPaymentsApi = {
  list: (params) => client.get('/crew-payments', { params }).then(r => r.data),
  create: (data) => client.post('/crew-payments', data).then(r => r.data),
  update: (id, data) => client.put(`/crew-payments/${id}`, data).then(r => r.data),
  delete: (id) => client.delete(`/crew-payments/${id}`).then(r => r.data),
};

// ── EQUIPMENT ─────────────────────────────────────────────────────────────────
export const equipmentApi = {
  list: (params) => client.get('/equipment', { params }).then(r => r.data),
  get: (id) => client.get(`/equipment/${id}`).then(r => r.data),
  create: (data) => client.post('/equipment', data).then(r => r.data),
  update: (id, data) => client.put(`/equipment/${id}`, data).then(r => r.data),
  delete: (id) => client.delete(`/equipment/${id}`).then(r => r.data),
};

// ── VENDORS ───────────────────────────────────────────────────────────────────
export const vendorsApi = {
  list: (params) => client.get('/vendors', { params }).then(r => r.data),
  get: (id) => client.get(`/vendors/${id}`).then(r => r.data),
  create: (data) => client.post('/vendors', data).then(r => r.data),
  update: (id, data) => client.put(`/vendors/${id}`, data).then(r => r.data),
  delete: (id) => client.delete(`/vendors/${id}`).then(r => r.data),
};

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  list: (params) => client.get('/payments', { params }).then(r => r.data),
  create: (data) => client.post('/payments', data).then(r => r.data),
  update: (id, data) => client.put(`/payments/${id}`, data).then(r => r.data),
  delete: (id) => client.delete(`/payments/${id}`).then(r => r.data),
};

// ── EXPENSES ──────────────────────────────────────────────────────────────────
export const expensesApi = {
  list: (params) => client.get('/expenses', { params }).then(r => r.data),
  create: (data) => client.post('/expenses', data).then(r => r.data),
  update: (id, data) => client.put(`/expenses/${id}`, data).then(r => r.data),
  delete: (id) => client.delete(`/expenses/${id}`).then(r => r.data),
};

// ── REMINDERS ─────────────────────────────────────────────────────────────────
export const remindersApi = {
  list: (params) => client.get('/reminders', { params }).then(r => r.data),
  create: (data) => client.post('/reminders', data).then(r => r.data),
  update: (id, data) => client.put(`/reminders/${id}`, data).then(r => r.data),
  dismiss: (id) => client.patch(`/reminders/${id}/dismiss`).then(r => r.data),
  delete: (id) => client.delete(`/reminders/${id}`).then(r => r.data),
};

// ── LEADS (tentative_jobs) ────────────────────────────────────────────────────
export const leadsApi = {
  list: (params) => client.get('/tentativejobs', { params }).then(r => r.data),
  get: (id) => client.get(`/tentativejobs/${id}`).then(r => r.data),
  create: (data) => client.post('/tentativejobs', data).then(r => r.data),
  update: (id, data) => client.put(`/tentativejobs/${id}`, data).then(r => r.data),
  convert: (id, data) => client.post(`/tentativejobs/${id}/convert-to-customer`, data).then(r => r.data),
  delete: (id) => client.delete(`/tentativejobs/${id}`).then(r => r.data),
};

// ── REPORTS ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  financial: (params) => client.get('/reports/financial', { params }).then(r => r.data),
  jobs: (params) => client.get('/reports/jobs', { params }).then(r => r.data),
  crew: (params) => client.get('/reports/crew', { params }).then(r => r.data),
  equipment: (params) => client.get('/reports/equipment', { params }).then(r => r.data),
  customers: (params) => client.get('/reports/customers', { params }).then(r => r.data),
  expenses: (params) => client.get('/reports/expenses', { params }).then(r => r.data),
  monthly: (params) => client.get('/summaries/monthly', { params }).then(r => r.data),
  yearly: (params) => client.get('/summaries/yearly', { params }).then(r => r.data),
  weekly: (params) => client.get('/summaries/weekly', { params }).then(r => r.data),

};

export const reportsApi1 = {
  // existing ones (keep if still used elsewhere)
  financialSummary: (p) => client.get('/reports/financial-summary', { params: p }),
  jobsSummary: (p) => client.get('/reports/jobs-summary', { params: p }),
  customersSummary: (p) => client.get('/reports/customers-summary', { params: p }),
  crewSummary: (p) => client.get('/reports/crew-summary', { params: p }),
  weeklySummary: (p) => client.get('/reports/weekly-summary', { params: p }),
  monthlySummary: (p) => client.get('/reports/monthly-summary', { params: p }),
  yearlySummary: (p) => client.get('/reports/yearly-summary', { params: p }),

  // new ones used by ReportsPage
  monthly: () => client.get('/reports/monthly'),
  financial: (p) => client.get('/reports/financial', { params: p }),
  jobs: (p) => client.get('/reports/jobs', { params: p }),
  crew: () => client.get('/reports/crew'),
  equipment: () => client.get('/reports/equipment'),
  customers: () => client.get('/reports/customers'),
  expenses: (p) => client.get('/reports/expenses', { params: p }),
};

// ── INVOICES ──────────────────────────────────────────────────────────────────
export const invoicesApi = {
  list: (params) => client.get('/invoices', { params }).then(r => r.data),
  get: (id) => client.get(`/invoices/${id}`).then(r => r.data),
  create: (data) => client.post('/invoices', data).then(r => r.data),
  update: (id, data) => client.put(`/invoices/${id}`, data).then(r => r.data),
  delete: (id) => client.delete(`/invoices/${id}`).then(r => r.data),
};
