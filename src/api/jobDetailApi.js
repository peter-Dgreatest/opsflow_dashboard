import client from './client';

const r = d => d?.data || d;

// ── Job detail ────────────────────────────────────────────────────────────────
export const jobDetailApi = {
  get: (id) => client.get(`/jobs/${id}`).then(r => r.data),

  // Rental items — GET returns { inhouse, outsourced, equipmentBookedDates }
  getRentalItems: (jobId) => client.get(`/jobs/${jobId}/rental-items`).then(r => r.data),
  addInhouseRentals: (jobId, data) => client.post(`/jobs/${jobId}/rental-items/inhouse`, data).then(r => r.data),
  addOutsourcedRental: (jobId, data) => client.post(`/jobs/${jobId}/rental-items/outsourced`, data).then(r => r.data),
  deleteInhouseRental: (jobId, id) => client.delete(`/jobs/${jobId}/rental-items/inhouse/${id}`).then(r => r.data),
  deleteOutsourcedRental: (jobId, id) => client.delete(`/jobs/${jobId}/rental-items/outsourced/${id}`).then(r => r.data),

  // Crew — GET returns { inhouse, outsourced }
  // Both inhouse and outsourced POST to same endpoint, distinguished by crew_type in body
  getCrew: (jobId) => client.get(`/jobs/${jobId}/crew`).then(r => r.data),
  addCrew: (jobId, data) => client.post(`/jobs/${jobId}/crew`, data).then(r => r.data),
  updateInhouseCrew: (id, data) => client.put(`/jobs/crew/${id}`, data).then(r => r.data),
  deleteInhouseCrew: (id) => client.delete(`/jobs/crew/${id}`).then(r => r.data),
  // Outsourced update/delete use different path
  updateOutsourcedCrew: (jobId, id, data) => client.put(`/jobs/${jobId}/outsourced-crew/${id}`, data).then(r => r.data),
  deleteOutsourcedCrew: (jobId, id) => client.delete(`/jobs/${jobId}/outsourced-crew/${id}`).then(r => r.data),

  // Purchase items
  getPurchaseItems: (jobId) => client.get(`/jobs/${jobId}/purchase-items`).then(r => r.data),
  addPurchaseItem: (jobId, data) => client.post(`/jobs/${jobId}/purchase-items`, data).then(r => r.data),
  updatePurchaseItem: (id, data) => client.put(`/purchase-items/${id}`, data).then(r => r.data),
  deletePurchaseItem: (id) => client.delete(`/purchase-items/${id}`).then(r => r.data),

  // Expenses (job-scoped)
  getExpenses: (jobId) => client.get(`/jobs/${jobId}/expenses`).then(r => r.data),
  addExpense: (jobId, data) => client.post(`/jobs/${jobId}/expenses`, data).then(r => r.data),
  deleteExpense: (id) => client.delete(`/expenses/${id}`).then(r => r.data),

  // Payments (job-scoped)
  getPayments: (jobId) => client.get(`/payments?jobId=${jobId}`).then(r => r.data),
  addPayment: (data) => client.post(`/payments`, data).then(r => r.data),
  deletePayment: (id) => client.delete(`/payments/${id}`).then(r => r.data),

  getFinancials: (id) => client.get(`jobs/${id}/financials`).then(r => r.data),

  // Job status update
  updateStatus: (id, status) => client.put(`/jobs/${id}`, { jobStatus: status }).then(r => r.data),
};
