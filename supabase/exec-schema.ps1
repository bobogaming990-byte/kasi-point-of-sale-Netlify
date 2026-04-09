# Execute Supabase Schema
# Run: .\supabase\exec-schema.ps1

$env:PGPASSWORD = "81MonokaneStr"

psql `
  -h db.najaumlvalnwybstqrcx.supabase.co `
  -p 5432 `
  -U postgres `
  -d postgres `
  -f supabase/schema.sql

Write-Host "Schema execution complete!"
