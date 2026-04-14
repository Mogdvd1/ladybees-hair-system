# Deploying LadyBee's Hair with Flair to Vercel

This app is now optimized for Vercel deployment. Follow these steps to get it live permanently:

## 1. Export to GitHub
1. Click the **Settings** (gear icon) in the top right of AI Studio.
2. Select **Export to GitHub**.
3. Follow the prompts to create a new repository.

## 2. Connect to Vercel
1. Go to [Vercel.com](https://vercel.com) and sign in (use your GitHub account).
2. Click **"Add New..."** -> **"Project"**.
3. Import the repository you just created.
4. Vercel will automatically detect it as a **Vite** project.
5. Click **Deploy**.

## 3. Configuration
The app currently uses the `firebase-applet-config.json` file for its database connection. This is already included in your code, so it will work "out of the box" on Vercel.

## Troubleshooting Common Errors

### 1. "Failed to resolve src/main.tsx"
This is the most common error. It means Vercel can't find your code.
*   **The Fix**: When you upload to GitHub, you **MUST** drag the `src` folder and `index.html` file into the repository window.
*   **Visual Check**: Open your GitHub repository. You should see `index.html` and the `src` folder **immediately**. If you see a folder named `ladybees-hair-system` first, you must delete it and re-upload the **contents** of that folder instead.
*   **Path Update**: I have updated the code to use `src/main.tsx` (v1.3.5), which is the most compatible format.

### 2. "Login Error" on the live site
You must add your Vercel URL to the "Authorized Domains" in the Firebase Console (Authentication -> Settings).
