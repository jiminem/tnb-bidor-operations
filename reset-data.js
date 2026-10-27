// Apply the requested reset once per browser, before either dashboard loads.
(() => {
  const marker = 'tnb-data-reset-5716876b-2122-4bf1-afec-6d9811794e46';
  if (localStorage.getItem(marker) === 'done') return;
  for (const key of [
    'tnb-daily-customer-counts-v1',
    'tnb-crp-data-v1',
    'tnb-crp-sheet-link-v1',
    'Kedai Tenaga TNB Bidor-customer-service-records-v1'
  ]) localStorage.removeItem(key);
  localStorage.setItem(marker, 'done');
})();
