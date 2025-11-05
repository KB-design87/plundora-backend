const path = require('path');
const fs = require('fs/promises');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'plundora-frontend');
const distDir = path.join(frontendDir, 'dist');

dotenv.config({ path: path.join(rootDir, '.env') });

async function ensureEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function copyRecursive(src, dest) {
  const stat = await fs.stat(src);
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src);
    for (const entry of entries) {
      if (entry === 'dist') {
        continue;
      }
      await copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }
}

async function build() {
  const googleMapsKey = await ensureEnvVar('GOOGLE_MAPS_API_KEY');
  const stripePublicKey = await ensureEnvVar('STRIPE_PUBLISHABLE_KEY');
  const apiBaseUrl = process.env.FRONTEND_API_BASE_URL || process.env.API_BASE_URL || 'https://plundora.onrender.com';
  const adsensePublisherId = process.env.ADSENSE_PUBLISHER_ID || '';
  const adsenseSlotTop = process.env.ADSENSE_SLOT_TOP || '';
  const adsenseSlotRectangle = process.env.ADSENSE_SLOT_RECTANGLE || '';

  const templatePath = path.join(frontendDir, 'index.html');
  const template = await fs.readFile(templatePath, 'utf8');

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  let transformed = template;

  if (!adsensePublisherId) {
    console.warn('⚠️  ADSENSE_PUBLISHER_ID not set; stripping AdSense blocks from build output.');
    transformed = transformed.replace(/<!--ADSENSE_BLOCK_START-->[\s\S]*?<!--ADSENSE_BLOCK_END-->/g, '');
  } else {
    transformed = transformed
      .replace(/<!--ADSENSE_BLOCK_START-->/g, '')
      .replace(/<!--ADSENSE_BLOCK_END-->/g, '');
  }

  const replacements = new Map([
    ['GOOGLE_MAPS_API_KEY', googleMapsKey],
    ['STRIPE_PUBLIC_KEY', stripePublicKey],
    ['API_BASE_URL', apiBaseUrl],
    ['ADSENSE_PUBLISHER_ID', adsensePublisherId],
    ['ADSENSE_SLOT_TOP', adsenseSlotTop],
    ['ADSENSE_SLOT_RECTANGLE', adsenseSlotRectangle],
  ]);

  for (const [placeholder, value] of replacements) {
    transformed = transformed.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), value);
  }

  await fs.writeFile(path.join(distDir, 'index.html'), transformed, 'utf8');

  const entries = await fs.readdir(frontendDir);
  for (const entry of entries) {
    if (['index.html', 'dist'].includes(entry)) {
      continue;
    }
    await copyRecursive(path.join(frontendDir, entry), path.join(distDir, entry));
  }

  console.log('✅ Frontend build complete. Output directory:', distDir);
}

build().catch((error) => {
  console.error('❌ Failed to build frontend:', error.message);
  process.exit(1);
});

