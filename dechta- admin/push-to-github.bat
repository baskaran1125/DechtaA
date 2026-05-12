@echo off
REM ========================================
REM DECHTA - PUSH TO GITHUB SCRIPT
REM ========================================

echo.
echo ╔════════════════════════════════════════╗
echo ║   DECHTA - PUSH TO GITHUB              ║
echo ╚════════════════════════════════════════╝
echo.

cd /d "c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta"

echo [1/8] Checking Git installation...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git is not installed!
    echo Please install from: https://git-scm.com/download/win
    pause
    exit /b 1
)
echo ✅ Git is installed

echo.
echo [2/8] Checking if .gitignore exists...
if exist ".gitignore" (
    echo ✅ .gitignore found
) else (
    echo ❌ .gitignore not found! Please create it first.
    pause
    exit /b 1
)

echo.
echo [3/8] Checking git repository status...
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Git repository not initialized. Initializing now...
    git init
    echo ✅ Git repository initialized
) else (
    echo ✅ Git repository already initialized
)

echo.
echo [4/8] Checking for sensitive files...
echo.
echo ⚠️  IMPORTANT: Make sure these files are NOT staged:
echo    - backend/.env
echo    - SKILL.md
echo    - node_modules/
echo    - uploads/
echo.

echo Checking if .env is tracked...
git ls-files | findstr ".env" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  WARNING: .env file is tracked! Removing from git...
    git rm --cached backend/.env 2>nul
    git rm --cached .env 2>nul
    echo ✅ Removed .env from tracking
)

echo Checking if SKILL.md is tracked...
git ls-files | findstr "SKILL.md" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  WARNING: SKILL.md is tracked! Removing from git...
    git rm --cached SKILL.md 2>nul
    echo ✅ Removed SKILL.md from tracking
)

echo.
echo [5/8] Checking remote repository...
git remote -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  No remote repository configured.
    echo.
    echo Please provide your GitHub repository URL:
    echo Example: https://github.com/yourusername/dechta.git
    echo.
    set /p REPO_URL="Enter GitHub repository URL: "
    
    if not defined REPO_URL (
        echo ❌ No URL provided. Exiting...
        pause
        exit /b 1
    )
    
    git remote add origin !REPO_URL!
    echo ✅ Remote repository added: !REPO_URL!
) else (
    echo ✅ Remote repository already configured:
    git remote -v
)

echo.
echo [6/8] Staging files for commit...
git add .
echo ✅ Files staged

echo.
echo [7/8] Creating commit...
git commit -m "Initial commit: Dechta construction marketplace platform

- Backend: Express + Drizzle ORM + PostgreSQL
- Frontend: React + Vite + TailwindCSS
- Ops Portal: Admin dashboard
- Features: Product management, orders, support chat, real-time tracking
- Test infrastructure ready (9 tests)
- Documentation: README, test plans, integration roadmap"

if %errorlevel% neq 0 (
    echo ⚠️  Commit failed or nothing to commit
    echo.
    echo Checking status...
    git status
    echo.
    pause
)

echo.
echo [8/8] Pushing to GitHub...
echo.
echo Pushing to main branch...
git branch -M main
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo ❌ Push failed!
    echo.
    echo Common issues:
    echo 1. Authentication required - You may need to:
    echo    - Use GitHub CLI: gh auth login
    echo    - Or use Personal Access Token instead of password
    echo    - Or configure SSH keys
    echo.
    echo 2. Repository doesn't exist - Create it on GitHub first:
    echo    https://github.com/new
    echo.
    echo 3. Branch protection - Check GitHub repository settings
    echo.
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════╗
echo ║   ✅ SUCCESSFULLY PUSHED TO GITHUB!    ║
echo ╚════════════════════════════════════════╝
echo.
echo Your Dechta project is now on GitHub!
echo.
git remote get-url origin
echo.
pause
