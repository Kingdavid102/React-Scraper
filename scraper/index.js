const express = require('express');
const puppeteer = require('puppeteer');
const archiver = require('archiver');
const fs = require('fs-extra');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  const id = nanoid();
  const folderPath = path.join(__dirname, `../temp/${id}`);
  await fs.ensureDir(folderPath);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    const html = await page.content();
    await fs.outputFile(`${folderPath}/index.html`, html);

    const zipPath = path.join(__dirname, `../temp/${id}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.directory(folderPath, false);
    archive.pipe(output);
    await archive.finalize();

    output.on('close', async () => {
      res.download(zipPath, 'scraped-react-site.zip', async () => {
        await fs.remove(folderPath);
        await fs.remove(zipPath);
      });
    });
  } catch (err) {
    console.error('Scraping failed:', err);
    res.status(500).send('Scraping failed.');
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
