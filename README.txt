OUR LITTLE UNIVERSE — SHARED FEED UPGRADE

Files:
- index.html
- style.css
- app.js
- config.js
- supabase_setup.sql

WHAT THIS UPGRADE ADDS
- Shared feed showing posts from both accounts
- Feed filters: Our feed, Junry's posts, Russel's posts
- Author name displayed on each memory
- Author selector on the Add/Edit Memory form
- Existing memories and the existing Supabase project are preserved

IMPORTANT SETUP
1. Back up the current website files first.
2. In Supabase Dashboard > SQL Editor, run ONLY the new migration at the bottom of supabase_setup.sql:
   alter table public.memories add column if not exists author_name text;
   update public.memories set author_name = 'Our memory' where author_name is null;
   (You may run the whole file if you want; it uses IF NOT EXISTS and drops/recreates policies.)
3. Replace the matching files in your GitHub repository with these upgraded files.
4. Keep your existing Project URL and publishable key in config.js. Do not share secret/service_role keys.
5. Wait for GitHub Pages/Netlify to redeploy, then hard refresh the site.
6. Create a separate website login for your boyfriend through the site's Create an account button.
7. Both accounts use the same Supabase project, so they can see the same shared memories.

PRIVACY NOTE
The current SQL policies allow any authenticated user in this Supabase project to read/edit/delete memories, and the existing public image URLs may be accessible to anyone who has the URL. Do not treat this as a private two-person social network until access policies and storage are restricted to your two accounts.
The author dropdown is a label, not identity verification. Both users can select either name. A stronger version should map each auth user ID to an approved profile and enforce it in the database.


COVER PHOTO FIX + INSTALLABLE APP
1. In Supabase Dashboard, open SQL Editor, create a new query, paste the entire contents of cover_photo_migration.sql, and click Run. This adds a settings table and storage policies; it does not delete your memories.
2. Upload/replace ALL files from this ZIP in the root of your existing GitHub/Netlify website. Keep config.js connected to your existing Supabase project.
3. Wait for the website to redeploy. Log in, then use “Change our cover photo”. Wait for the success message before refreshing. The saved cover photo is shared across both accounts/devices.
4. Install on Android: open the deployed website in Chrome and choose Install app (or ⋮ > Install app/Add to Home screen). iPhone: open in Safari > Share > Add to Home Screen. HTTPS hosting is required for installation.
5. PWA installation does not publish the app to Google Play or Apple App Store.

IMPORTANT: the website still needs a working HTTPS deployment and Supabase configuration. If the SQL migration reports a policy conflict or error, do not delete tables; send the exact error message for troubleshooting.
