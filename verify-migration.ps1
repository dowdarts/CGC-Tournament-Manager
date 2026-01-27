# Verify Database Migration
# Run this after applying the migration to check if columns were added

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Verify Tournament Registration Columns" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking Supabase environment variables..." -ForegroundColor Yellow
if (-not $env:SUPABASE_URL) {
    Write-Host "✗ SUPABASE_URL not set!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please use the Supabase Dashboard to verify instead:" -ForegroundColor Yellow
    Write-Host "1. Go to Table Editor" -ForegroundColor White
    Write-Host "2. Click on 'tournaments' table" -ForegroundColor White
    Write-Host "3. Check if these columns exist:" -ForegroundColor White
    Write-Host "   - registration_price (decimal)" -ForegroundColor Green
    Write-Host "   - registration_close_time (timestamp)" -ForegroundColor Green
    Write-Host ""
    pause
    exit
}

Write-Host "✓ Environment configured" -ForegroundColor Green
Write-Host ""
Write-Host "Run this SQL query in Supabase Dashboard SQL Editor:" -ForegroundColor Yellow
Write-Host ""
Write-Host @"
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'tournaments'
    AND column_name IN ('registration_price', 'registration_close_time')
ORDER BY 
    column_name;
"@ -ForegroundColor White

Write-Host ""
Write-Host "Expected output:" -ForegroundColor Yellow
Write-Host "  column_name             | data_type | is_nullable" -ForegroundColor Green
Write-Host "  ------------------------|-----------|------------" -ForegroundColor Green
Write-Host "  registration_close_time | timestamp | YES" -ForegroundColor Green
Write-Host "  registration_price      | numeric   | YES" -ForegroundColor Green
Write-Host ""
pause
