# Veil

Veil is a browser-based image privacy lab. It applies experimental pixel variations locally and exports a separate PNG, JPEG, or WebP while leaving the source image untouched. JPEG and WebP exports include an adjustable quality setting.

## Run locally

Open `index.html` in a modern browser. No build step, dependencies, account, or image upload is required.

## Deploy

This repository uses GitHub Actions to publish the static app to GitHub Pages after every push to `main`. Once the workflow completes, the site is available at:

`https://notparthyt.github.io/veil-image-privacy/`

## Limitations

The variations are not a validated adversarial defense and do not guarantee protection from AI training, image generation, impersonation, or misuse. Screenshots, cropping, resizing, compression, and other transformations can change or remove pixel differences. The share simulation reports visual pixel differences only; it is not an AI-protection test. Exporting through the browser canvas creates a fresh image file and does not preserve source metadata such as EXIF information.

Image processing runs in the visitor's browser. The app does not upload selected images.
