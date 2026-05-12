# 🚀 PUSH DECHTA TO GITHUB - MANUAL GUIDE

## Prerequisites

1. **Git Installed**: Check with `git --version`
   - If not installed: https://git-scm.com/download/win

2. **GitHub Account**: Have your credentials ready
   - Username
   - Personal Access Token (recommended) or Password

3. **GitHub Repository Created**: 
   - Go to: https://github.com/new
   - Repository name: `dechta` (or your preferred name)
   - Privacy: Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have them)

---

## Option 1: Automated Script (Recommended)

**Simply run**:
```bash
cd c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta
push-to-github.bat
```

The script will:
- ✅ Check git installation
- ✅ Initialize repository if needed
- ✅ Remove sensitive files from tracking
- ✅ Add remote repository
- ✅ Stage all files
- ✅ Commit with message
- ✅ Push to GitHub

---

## Option 2: Manual Steps

### Step 1: Navigate to Project
```bash
cd c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta
```

### Step 2: Initialize Git (if not already)
```bash
git init
```

### Step 3: Verify .gitignore is Working
```bash
# Check what will be committed
git status

# You should NOT see:
# - backend/.env
# - SKILL.md
# - node_modules/
# - dist/
```

### Step 4: Remove Sensitive Files (if tracked)
```bash
# If .env is tracked, remove it
git rm --cached backend/.env
git rm --cached .env

# If SKILL.md is tracked, remove it
git rm --cached SKILL.md

# Remove node_modules if accidentally tracked
git rm -r --cached node_modules
```

### Step 5: Stage All Files
```bash
git add .
```

### Step 6: Create Initial Commit
```bash
git commit -m "Initial commit: Dechta construction marketplace platform

- Backend: Express + Drizzle ORM + PostgreSQL
- Frontend: React + Vite + TailwindCSS
- Ops Portal: Admin dashboard
- Features: Product management, orders, support chat, real-time tracking
- Test infrastructure ready (9 tests)
- Documentation: README, test plans, integration roadmap"
```

### Step 7: Add GitHub Remote
Replace `YOUR_USERNAME` with your actual GitHub username:
```bash
git remote add origin https://github.com/YOUR_USERNAME/dechta.git
```

### Step 8: Set Main Branch
```bash
git branch -M main
```

### Step 9: Push to GitHub
```bash
git push -u origin main
```

---

## 🔐 Authentication Options

### Option A: Personal Access Token (Recommended)

1. **Create Token**:
   - Go to: https://github.com/settings/tokens/new
   - Select scopes: `repo` (all)
   - Generate token
   - **Copy token immediately** (you can't see it again!)

2. **Use Token**:
   - When prompted for password, paste the token instead
   - Username: Your GitHub username
   - Password: [paste token here]

### Option B: GitHub CLI (Easiest)

1. **Install GitHub CLI**: https://cli.github.com/
2. **Authenticate**:
   ```bash
   gh auth login
   ```
3. **Follow prompts** to authenticate via browser

### Option C: SSH Keys

1. **Generate SSH Key**:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
2. **Add to GitHub**: https://github.com/settings/keys
3. **Use SSH URL**:
   ```bash
   git remote set-url origin git@github.com:YOUR_USERNAME/dechta.git
   ```

---

## ⚠️ PRE-PUSH CHECKLIST

Before pushing, verify these files are **NOT** in git:

```bash
# Check tracked files
git ls-files

# Should NOT include:
❌ backend/.env
❌ SKILL.md
❌ node_modules/
❌ dist/
❌ build/
❌ uploads/
❌ *.log
```

### Fix if They Appear:
```bash
# Remove from git tracking (keeps local file)
git rm --cached <filename>

# Then commit the removal
git commit -m "Remove sensitive files from tracking"
```

---

## 🐛 Troubleshooting

### Issue: "Permission denied (publickey)"
**Solution**: Use HTTPS instead of SSH, or set up SSH keys

```bash
# Switch to HTTPS
git remote set-url origin https://github.com/YOUR_USERNAME/dechta.git
```

### Issue: "Authentication failed"
**Solutions**:
1. Use Personal Access Token instead of password
2. Use GitHub CLI: `gh auth login`
3. Check username/token are correct

### Issue: "Repository not found"
**Solutions**:
1. Create repository on GitHub first: https://github.com/new
2. Verify remote URL: `git remote -v`
3. Fix URL: `git remote set-url origin <correct-url>`

### Issue: "Updates were rejected"
**Solution**: Pull first if repository has content
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### Issue: ".env file was pushed!"
**URGENT FIX**:
```bash
# Remove from history (IMPORTANT!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push
git push origin --force --all

# THEN: Change all passwords/secrets in .env immediately!
```

---

## ✅ Success Verification

After pushing, verify on GitHub:

1. **Go to your repository**: https://github.com/YOUR_USERNAME/dechta
2. **Check files are there**:
   - ✅ README.md
   - ✅ frontend/
   - ✅ backend/
   - ✅ ops/
   - ✅ .gitignore

3. **Verify sensitive files are NOT there**:
   - ❌ backend/.env (should be missing)
   - ❌ SKILL.md (should be missing)
   - ❌ node_modules/ (should be missing)

4. **Check commit**: Should show your commit message

---

## 📝 After Pushing

### 1. Add Repository Secrets (GitHub Actions)
If using CI/CD:
- Go to: Repository → Settings → Secrets and variables → Actions
- Add:
  - `DATABASE_URL`
  - `SESSION_SECRET`

### 2. Add README Badge (Optional)
Add build status, license, etc. to README.md

### 3. Enable GitHub Pages (Optional)
For documentation hosting

### 4. Set Branch Protection Rules (Recommended)
- Go to: Settings → Branches
- Add rule for `main` branch
- Require pull request reviews

---

## 🎯 Quick Command Reference

```bash
# Navigate to project
cd c:\Users\LOKI\OneDrive\Desktop\Dechta\dechta

# Check status
git status

# Stage all
git add .

# Commit
git commit -m "Your message"

# Push
git push origin main

# Pull latest
git pull origin main

# View remotes
git remote -v

# View commit history
git log --oneline
```

---

## 🚀 READY TO PUSH!

Choose your method:
- **Easy**: Run `push-to-github.bat`
- **Manual**: Follow Step 1-9 above

Make sure your GitHub repository is created first!

Good luck! 🎉
