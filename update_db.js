const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs';
const url = 'https://nptkxlrhrlssdsevpgqe.supabase.co/rest/v1/companies?name=ilike.*Teste*';

fetch(url, {
  method: 'PATCH',
  headers: {
    'apikey': apikey,
    'Authorization': 'Bearer ' + apikey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({ active: true, is_active: true })
})
.then(res => res.json())
.then(data => console.log('UPDATE RESULT:', JSON.stringify(data, null, 2)))
.catch(console.error);
