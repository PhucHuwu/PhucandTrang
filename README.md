# 💕 Our Love Story Website

A beautiful, romantic website to celebrate our love journey together. This website features our precious moments, memories, and the story of us since October 20, 2022.

## ✨ What's This?

This is a personal love story website that includes:

-   💑 A sweet hero section with our love confession
-   📅 A day counter showing how long we've been together
-   📸 A photo gallery of our beautiful moments
-   📖 A timeline of our love story
-   🎵 Background music to set the mood

## � Getting Started (For Beginners)

### Step 1: Download This Project

**Option A: Download as ZIP (Easiest)**

1. Click the green "Code" button at the top of this page
2. Click "Download ZIP"
3. Extract the ZIP file to a folder on your computer
4. You now have all the files! 🎉

**Option B: Use Git (If you're familiar)**

```bash
git clone https://github.com/PhucHuwu/PhucandTrang.git
```

### Step 2: Customize Your Content

Before uploading, make your website personal:

1. **Add your photos** to the `public/img/` folder
2. **Add your music** to the `public/music/` folder
3. **Edit** `public/index.html` to change the text and dates
4. **Update** `public/script.js` to change the start date

### Step 3: Upload to GitHub

**If you don't have a GitHub account yet:**

1. Go to [github.com](https://github.com) and sign up (it's free!)
2. Verify your email address

**Create a new repository:**

1. Click the "+" icon in the top right → "New repository"
2. Name it something like "our-love-story" or "my-wedding-site"
3. Choose "Public" (so it can be deployed for free)
4. **Don't** check "Initialize with README" (we already have files)
5. Click "Create repository"

**Upload your files:**

**Method 1: Using the Website (No technical skills needed)**

1. On your new repository page, click "uploading an existing file"
2. Drag and drop ALL the folders and files from your extracted ZIP
3. Make sure to upload:
    - The `public` folder with all its contents
    - `package.json`
    - `README.md`
    - `vercel.json`
4. Write a commit message like "Initial upload"
5. Click "Commit changes"
6. Done! Your code is now on GitHub! 🎊

**Method 2: Using Git (For those comfortable with terminal)**

1. Open terminal/command prompt in your project folder
2. Run these commands:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git branch -M main
git push -u origin main
```

## �🚀 How to Deploy Your Own Website

Now that your code is on GitHub, let's make it live on the internet!

### Option 1: Deploy to Vercel (Recommended - Super Easy!)

1. **Create a Vercel Account**

    - Go to [vercel.com](https://vercel.com)
    - Sign up with your GitHub account (it's free!)

2. **Connect Your Repository**

    - Click "Add New" → "Project"
    - Import your GitHub repository
    - Vercel will automatically detect your project

3. **Deploy**
    - Click "Deploy"
    - Wait 1-2 minutes
    - Done! Your website is live! 🎉
    - You'll get a URL like `your-project.vercel.app`

### Option 2: Deploy to Netlify (Also Easy!)

1. **Create a Netlify Account**

    - Go to [netlify.com](https://netlify.com)
    - Sign up with your GitHub account (it's free!)

2. **Deploy Your Site**

    - Click "Add new site" → "Import an existing project"
    - Connect to GitHub and select your repository
    - Build settings:
        - Build command: leave empty
        - Publish directory: `public`
    - Click "Deploy site"

3. **Your Site is Live!**
    - Netlify will give you a URL like `your-site-name.netlify.app`
    - You can customize the URL in site settings

### Option 3: Deploy to GitHub Pages

1. **Enable GitHub Pages**

    - Go to your repository on GitHub
    - Click "Settings" → "Pages"
    - Under "Source", select your main branch
    - Set folder to `/` (root) or `/public` depending on your structure
    - Click "Save"

2. **Access Your Website**
    - Your site will be available at: `https://yourusername.github.io/repository-name`
    - It may take a few minutes to go live

## 🔄 How to Update Your Website

After you've deployed, you can update your website anytime:

1. **Make changes** to your files on your computer
2. **Upload to GitHub**:
    - **Website method**: Go to GitHub → your repository → click "Add file" → "Upload files"
    - **Git method**:
        ```bash
        git add .
        git commit -m "Updated photos/text"
        git push
        ```
3. **Automatic deployment**: Vercel/Netlify will automatically update your live site within 1-2 minutes!

## ⚠️ Common Issues & Solutions

**Problem: Images not showing up**

-   Make sure images are in the `public/img/` folder
-   Check that filenames in `index.html` match your actual image files
-   Image names are case-sensitive (photo.jpg ≠ Photo.JPG)

**Problem: Music not playing**

-   Make sure your music file is in `public/music/` folder
-   Check the filename in `index.html` matches your music file
-   Some browsers block autoplay - users may need to click the music button

**Problem: Website shows 404 error**

-   For GitHub Pages: Make sure you selected the correct branch and folder
-   Wait 5-10 minutes after deployment
-   Check that `index.html` is in the correct location

**Problem: Changes not showing up**

-   Clear your browser cache (Ctrl + F5 or Cmd + Shift + R)
-   Wait a few minutes for deployment to complete
-   Check that you pushed changes to the correct branch

## 🎨 How to Customize

### Change the Photos

1. Go to the `public/img/` folder
2. Replace the images (keep the same names or update `index.html`)
3. Recommended: Use images that are under 2MB for faster loading

### Change the Music

1. Go to the `public/music/` folder
2. Add your favorite song (MP3 format works best)
3. Update the filename in `index.html` if needed

### Update Your Love Story

1. Open `public/index.html` in any text editor
2. Find the sections you want to change:
    - Hero section: Change the confession text
    - Timeline: Update your important dates
    - Gallery: Change photo descriptions
3. Save the file and refresh your browser

### Change the Start Date

1. Open `public/script.js`
2. Find the line: `const startDate = new Date('2022-10-20');`
3. Change the date to your special day
4. Save and reload

## 🎵 Music Note

The website includes background music that plays automatically (with user permission). Make sure your music file is in the `public/music/` folder!

## 💝 Made with Love

This website is created to celebrate our beautiful journey together. Every moment, every smile, every memory - all captured here forever.

---

**Need Help?** Feel free to reach out if you have any questions about deploying or customizing your love story website! ❤️
