# Instructions to Push to GitHub

Due to permission restrictions on the external drive, please run these commands manually in your terminal:

## Step 1: Initialize Git (if needed)
```bash
cd /Volumes/HashSSD/mywork/restaurent
git init
```

## Step 2: Add Remote Repository
```bash
git remote add origin https://github.com/hashdev89/restaurenthub.git
```

## Step 3: Stage All Files
```bash
git add .
```

## Step 4: Create Initial Commit
```bash
git commit -m "Initial commit: Restaurant Next.js application"
```

## Step 5: Push to GitHub
```bash
git branch -M main
git push -u origin main
```

## Alternative: If you get permission errors

If you continue to get permission errors, you may need to:

1. **Fix directory permissions:**
   ```bash
   sudo chmod -R u+w /Volumes/HashSSD/mywork/restaurent
   ```

2. **Or initialize git in a different location and copy files:**
   - Create the repo in a location with proper permissions
   - Copy files there
   - Push from that location

3. **Or use GitHub Desktop or another Git GUI** that may handle permissions differently

## Note
Make sure you have:
- GitHub credentials configured (personal access token or SSH key)
- Write access to the repository
