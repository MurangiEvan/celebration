# celebration

A small static website for viewing and sharing the original birthday poster. It has no application server or build step. The poster stays unmodified; image zooming and panning run in the browser, and PDF files use the browser's built-in viewer.

## Add the poster

The original program already in this workspace is loaded directly from `poster/birthday programme.png`; it is not moved or modified. Future images and PDFs can use `public/poster/` with one of these names:

- Image: `birthday-poster.jpg`, `.png`, `.webp`, `.jpeg`, or `.avif`
- PDF: `birthday-poster.pdf`

Images are checked first. If no supported image is found, the site checks for the PDF. The viewer also recognizes the earlier filename `poster/birthday poster.png`.

The website's public asset paths are `/poster/birthday%20programme.png` for the existing program, `/public/poster/birthday-poster.jpg` (or the matching extension), and `/public/poster/birthday-poster.pdf`.

## Run locally

Python 3 is sufficient; there are no local packages to install.

```powershell
py -3 -m http.server 4173
```

Open <http://localhost:4173>. If the Python launcher is unavailable, use `python -m http.server 4173` where Python is installed. A local file URL (`file://`) is not a suitable test because browser asset loading can behave differently.

## Test the viewer

With the existing poster or a supported asset in `public/poster/`, reload the page. For images, test the `+` and `−` controls, Fit, Reset, fullscreen, mouse-wheel zoom, keyboard `+`, `-`, and `0`, pointer dragging, and two-finger pinch on a touch device. The image is presented at its original aspect ratio. For PDFs, use the browser PDF controls for zoom and page navigation; the link below the viewer opens the original PDF in a separate tab.

## Configure the public URL and QR code

This is a static site, so it cannot read a Vercel environment variable at runtime. After deployment, edit `site-config.js` and set the complete deployed URL, including `https://`:

```js
window.BIRTHDAY_SITE_URL = "https://your-deployed-domain.example";
```

Commit or upload that change and redeploy. Reload the live page, choose **Generate QR code**, and download the PNG or SVG. The generated code is black on white, has a four-module quiet zone, uses high error correction, and is 1200 pixels wide for print. The URL must use HTTPS. A configured localhost URL is explicitly marked as a development test and must not be printed as the final code. If no production URL is configured, generation remains disabled.

Anyone scanning the online QR code needs internet access to open the website and poster.

## Deploy to Vercel

1. Put the project in a Git repository and import it in Vercel, or deploy the folder using the Vercel CLI.
2. The checked-in `vercel.json` selects the **Other** framework preset and sets the project root as the output directory. There is no build step.
3. Deploy and copy the resulting public HTTPS URL.
4. Put that URL in `site-config.js`, commit the change, and redeploy.
5. Open the deployed page and generate/download the final QR code there.

Do not print a QR code generated with a localhost URL. The production URL is not preconfigured in this workspace, and deployment has not been performed here.

## Update the poster

Replace the image in `poster/` while keeping the filename `birthday programme.png`, or add a supported file to `public/poster/`. Deploy the changed file. Keeping the same filename means the QR code does not need to change when only the poster content changes. To change the filename or public page address, update the matching website configuration and regenerate the QR code as needed.

## Troubleshooting

- **Poster not found:** confirm that `poster/birthday programme.png` is present, or check the filename and exact `public/poster/` path, including case, and reload the page.
- **PDF does not display inline:** use **Open original PDF**; the browser's PDF viewer and mobile support vary.
- **QR generation is disabled:** set a complete public HTTPS URL in `site-config.js`, then reload. The QR library is loaded from esm.sh, so QR generation needs internet access.
- **QR library does not load:** check connectivity to esm.sh and reload. Poster viewing itself does not depend on that library.
- **Changes do not appear after deployment:** confirm the poster and `site-config.js` were included in the deployed revision, then reload without cache.
- **QR scans but poster does not open:** scan-test the final print from a second device and confirm the deployed URL and poster asset load over HTTPS.