# Finding Your App URL

When running `shopify app dev`, the CLI creates a Cloudflare tunnel URL that changes each time you restart the server.

## How to Find Your Current App URL

1. **Look at your terminal** where `shopify app dev` is running
2. **Find the line** that says something like:
   ```
   app_home │ └ Using URL: https://some-random-name.trycloudflare.com
   ```
3. **Copy that URL** - that's your current app URL

## How to Update It in Theme Editor

1. Go to **Online Store** → **Themes** → **Customize**
2. Find your **AlleDrops Symptom Quiz** block
3. In the right sidebar, find **App Configuration** → **App URL**
4. **Paste the new URL** from your terminal
5. **Save** the theme

## Pro Tip: Keep Terminal Visible

Keep your terminal visible while developing so you can quickly copy the URL when it changes.

## Future Improvement

We could add a script that automatically detects and updates the app URL, but for now, manual update is required.

