const sharp = require('sharp');
const path = require('path');

const srcPath = 'C:/Users/likit/.gemini/antigravity/brain/227df510-465e-44c0-bf10-5d897d3b4349/media__1781206811962.png';
const outPath = path.join(__dirname, '../assets/images/circular_notif_icon.png');

async function processIcon() {
  console.log('Reading source image from:', srcPath);
  const image = sharp(srcPath);
  const metadata = await image.metadata();
  console.log('Source image metadata:', metadata);

  // We want to extract the red heart silhouette.
  // Let's load raw pixel data.
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(`Loaded raw pixel data: width=${info.width}, height=${info.height}, channels=${info.channels}`);

  // We will create a new image of size 512x512.
  const size = 512;
  const outBuffer = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const rCircle = 240; // Circle radius

  // 1. Draw a white circle
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= rCircle * rCircle) {
        outBuffer[idx] = 255;     // R
        outBuffer[idx + 1] = 255; // G
        outBuffer[idx + 2] = 255; // B
        outBuffer[idx + 3] = 255; // A (Fully opaque)
      } else {
        outBuffer[idx + 3] = 0;   // Transparent
      }
    }
  }

  // 2. Resize and extract the heart from the source image.
  // The heart is red. Let's find all red/colored pixels from the source and clean them up.
  const cleanHeartBuffer = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Check if pixel is red/pinkish
    if (r > 120 && r > g + 30 && r > b + 30 && a > 50) {
      // Keep as solid white in the intermediate image (we'll subtract this from the circle)
      cleanHeartBuffer[i] = 255;
      cleanHeartBuffer[i + 1] = 255;
      cleanHeartBuffer[i + 2] = 255;
      cleanHeartBuffer[i + 3] = a;
    } else {
      cleanHeartBuffer[i + 3] = 0;
    }
  }

  // Save intermediate clean heart to resize it nicely
  const resizedHeartBuffer = await sharp(cleanHeartBuffer, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .resize(340, 340, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const heartData = resizedHeartBuffer.data;
  const heartInfo = resizedHeartBuffer.info;

  // 3. Subtract the heart shape from the white circle (making a cutout)
  const ox = Math.round((size - heartInfo.width) / 2);
  const oy = Math.round((size - heartInfo.height) / 2);

  for (let hy = 0; hy < heartInfo.height; hy++) {
    for (let hx = 0; hx < heartInfo.width; hx++) {
      const hIdx = (hy * heartInfo.width + hx) * 4;
      const hAlpha = heartData[hIdx + 3];

      if (hAlpha > 0) {
        const tx = ox + hx;
        const ty = oy + hy;
        const outIdx = (ty * size + tx) * 4;
        
        // Subtract alpha to create the cutout
        outBuffer[outIdx + 3] = Math.max(0, outBuffer[outIdx + 3] - hAlpha);
      }
    }
  }

  // 4. Save the final circular cutout notification icon
  await sharp(outBuffer, { raw: { width: size, height: size, channels: 4 } })
    .png()
    .toFile(outPath);

  console.log('Successfully generated new white circular cutout notification icon at:', outPath);
}

processIcon().catch(console.error);
