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
*   **Path Update**: I have updated the code to use `src/main.tsx` (v1.4.8), which is the most compatible format.
*   **Mobile UI Fix**: Fixed an issue where modals were cut off on mobile devices, ensuring all form fields are accessible.
*   **Login Error Handling**: Added clear error messages if login fails due to unauthorized domains.
*   **Real-time Dashboard**: Replaced all simulated/placeholder figures with real-time data from your database.
*   **Input Optimization**: Fixed the "leading zero" issue in all numeric fields.
*   **Advanced Lay-by**: Added ability to backdate agreements, select products from catalog, toggle stock deduction, backdate individual payments, view remaining balance, and **link multiple items/agreements to a single customer**.
*   **Customer Profile**: Enhanced the Customer Directory history view to show all active lay-bys in one place and added a "New Lay-by" button for existing clients.
*   **Data Consistency Fix**: Fixed a bug where some customer data (phone, total spent) was not appearing in the directory. The system now correctly tracks and updates customer spending across both Sales and Lay-bys.
*   **Duplicate Prevention**: The system now automatically detects existing customers by their phone number to prevent duplicate entries in your directory.
*   **CSV Export Fix**: Fixed the "Export CSV" button in Reports.
*   **Customer Management**: Added ability for admins to edit and delete customer profiles directly from the directory.
*   **Bulk Import**: Added "Import CSV" feature in the Customer Directory to allow adding multiple clients at once.
*   **System Reset**: Added a new "Settings" tab with a "System Reset" feature. This allows the CEO to permanently wipe all test data (products, sales, customers, lay-bys) to start fresh with real entries.

### 2. "Login Error" or "Stuck" on the login screen
If the login popup doesn't appear or you see a "Domain not authorized" error:
1.  Go to the **Firebase Console**.
2.  Select your project.
3.  Go to **Authentication** -> **Settings** -> **Authorized Domains**.
4.  Click **"Add Domain"**.
5.  Paste your Vercel URL: `ladybees-hair-system.vercel.app`
6.  Click **Add**.
7.  Wait 1-2 minutes and try logging in again on your website.

*   **Note**: You must use the email `ladybeeshairwithflair@gmail.com` to see the CEO dashboard. Other emails will log in but won't have permission to add products or view reports.
