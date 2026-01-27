@echo off
echo ========================================
echo  Apply Tournament Registration Migration
echo ========================================
echo.
echo This script will apply the database migration to add:
echo - registration_price column
echo - registration_close_time column
echo.
echo Make sure you have set your Supabase credentials!
echo.
pause

REM Check if supabase CLI is available
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Supabase CLI not found!
    echo.
    echo Please install it or use the Supabase Dashboard SQL Editor instead.
    echo Visit: https://supabase.com/docs/guides/cli
    pause
    exit /b 1
)

echo.
echo Applying migration...
echo.

supabase db execute --file backend\migration_add_registration_fields.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Migration applied successfully!
    echo.
    echo You can now:
    echo 1. Refresh your browser
    echo 2. Create/edit tournaments with the new fields
    echo.
) else (
    echo.
    echo ✗ Migration failed!
    echo.
    echo Try applying via Supabase Dashboard SQL Editor instead.
    echo.
)

pause
