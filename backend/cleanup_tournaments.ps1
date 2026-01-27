# Tournament Cleanup Script
# This script helps you clean up tournaments created before user authentication

Write-Host "Tournament Cleanup Options:" -ForegroundColor Cyan
Write-Host "1. Clean slate (remove ALL tournaments)" -ForegroundColor Yellow
Write-Host "2. Remove only tournaments without users (after migration)" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "Enter your choice (1 or 2)"

switch ($choice) {
    "1" {
        Write-Host "This will delete ALL tournament data. Are you sure? (y/N)" -ForegroundColor Red
        $confirm = Read-Host
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            Write-Host "To execute this cleanup:" -ForegroundColor Green
            Write-Host "1. Go to your Supabase Dashboard" -ForegroundColor White
            Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
            Write-Host "3. Copy and paste the contents of:" -ForegroundColor White
            Write-Host "   backend/cleanup_tournaments_simple.sql" -ForegroundColor Yellow
            Write-Host "4. Run the query" -ForegroundColor White
            Write-Host ""
            Write-Host "This will remove all existing tournaments and related data." -ForegroundColor Red
        } else {
            Write-Host "Cleanup cancelled." -ForegroundColor Green
        }
    }
    "2" {
        Write-Host "Make sure you have applied the user authentication migration first!" -ForegroundColor Yellow
        Write-Host "Then use the commented lines in cleanup_tournaments_simple.sql" -ForegroundColor White
    }
    default {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Note: Always backup your database before running cleanup operations!" -ForegroundColor Magenta