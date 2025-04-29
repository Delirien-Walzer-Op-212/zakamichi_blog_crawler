import express from 'express'
import archiver from 'archiver'
import fs from 'fs'
import os from 'os';


const app = express()
app.use(express.json());

const interfaces = os.networkInterfaces();
const port = 5016
import {
  Hinatazaka46_BlogStatus_FilePath,
  Sakurazaka46_BlogStatus_FilePath,
  Nogizaka46_BlogStatus_FilePath,
  Bokuao_BlogStatus_FilePath,
  ExportFilePath,
  exportSingleMemberBlogImages,
  appendSingleMemberBlogImagesToArchive,
  parseDateTime,
  loadDesiredMemberList,
  addDesiredMember,
  removeDesiredMember,
  getMembers,               // or any other needed method
  // Possibly your function that returns the entire members list:
  // If you have "getFullMemberList()" in program.js, bring it in or re-implement here.
} from './global.js'; // or wherever your global methods are

// If you keep your "controller" modules in a folder "controller", import them:
import { Hinatazaka46_Crawler } from './controller/hinatazaka.js';
import { Sakurazaka46_Crawler } from './controller/sakurazaka.js';
import { Nogizaka46_Crawler } from './controller/nogizaka.js';
import { Bokuao_Crawler } from './controller/bokuao.js';


app.get('/hinatazaka', async (req, res) => {
  const result = await Hinatazaka46_Crawler();
  res.send(result)
})

app.get('/sakurazaka', async (req, res) => {
  const result = await Sakurazaka46_Crawler();
  res.send(result)
})

app.get('/nogizaka', async (req, res) => {
  const result = await Nogizaka46_Crawler();
  res.send(result)
})

app.get('/bokuao', async (req, res) => {
  const result = await Bokuao_Crawler();
  res.send(result)
})

// If you want a single function to gather all group members (like in your code):
function getFullMemberList() {
  return [
    ...getMembers(Hinatazaka46_BlogStatus_FilePath),
    ...getMembers(Sakurazaka46_BlogStatus_FilePath),
    ...getMembers(Nogizaka46_BlogStatus_FilePath),
    ...getMembers(Bokuao_BlogStatus_FilePath),
  ];
}

app.get('/export1', async (req, res) => {
  try {
    const { date } = req.query;

    const parseExportDate = (input) => {
      const defaultDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // fallback: 7 days ago
      if (input) {
        const parsed = new Date(parseDateTime(input, 'yyyyMMdd'));
        return isNaN(parsed.getTime())
          ? defaultDate
          : parsed;
      }
      return defaultDate
    };

    const lastUpdate = parseExportDate(date);

    console.log('[EXPORT]', { date, lastUpdate: lastUpdate.toISOString() });

    await Promise.all([
      Hinatazaka46_Crawler(),
      Sakurazaka46_Crawler(),
      Nogizaka46_Crawler()
    ]);

    fs.rmSync(ExportFilePath, { recursive: true, force: true });

    // get the full list of members from your app's logic
    const fullMemberList = getFullMemberList();
    const selectedDesiredMembers = loadDesiredMemberList();

    // filter only those the user requested
    const membersToExport = fullMemberList.filter(m => selectedDesiredMembers.includes(m.Name));
    if (membersToExport.length === 0) {
      return res.status(404).json({ error: 'No matching members found' });
    }

    // For each matching member, run the export logic
    // This presumably downloads images to the EXPORT_FOLDER
    await Promise.all(membersToExport.map(m => exportSingleMemberBlogImages(m, lastUpdate)))
      .then(() => console.log("Export of desired members before date complete."))

    // Now create a zip of everything under EXPORT_FOLDER
    // Or you can be more fine-grained (e.g., only zip subdirectories for relevant members).
    const archive = archiver('zip', { zlib: { level: 9 } });

    // If we want the user to get a download called "exported_images.zip":
    res.attachment('exported_images.zip');

    // Pipe the zip data into the response
    archive.pipe(res);

    // Add the entire Export directory (this might be big):
    archive.directory(ExportFilePath, false);

    // finalize the archive (this triggers it to start streaming)
    await archive.finalize();
  } catch (err) {
    console.error('Error in /api/export:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
  finally {
    fs.rmSync(ExportFilePath, { recursive: true, force: true });
  }
});

app.get('/export', async (req, res) => {
  try {
    const { date } = req.query;

    const parseExportDate = (input) => {
      const defaultDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // fallback: 7 days ago
      if (input) {
        const parsed = new Date(parseDateTime(input, 'yyyyMMdd'));
        return isNaN(parsed.getTime())
          ? defaultDate
          : parsed;
      }
      return defaultDate
    };

    const lastUpdate = parseExportDate(date);

    console.log('[EXPORT]', { date, lastUpdate: lastUpdate.toISOString() });

    await Promise.all([
      Hinatazaka46_Crawler(),
      Sakurazaka46_Crawler(),
      Nogizaka46_Crawler()
    ]);

    const fullMembers = getFullMemberList();
    const desiredNames = loadDesiredMemberList();

    const membersToExport = fullMembers.filter(m => desiredNames.includes(m.Name));
    if (!membersToExport.length) {
      return res.status(404).json({ error: 'No matching members found' });
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('exported_images.zip');
    archive.pipe(res);

    const archiveEntries = await Promise.all(
      membersToExport.map(m => appendSingleMemberBlogImagesToArchive(m, lastUpdate))
    );

    archiveEntries.flat().forEach(file => {
      archive.append(file.data, { name: file.name, date: file.date });
    });

    await archive.finalize();

    console.log('[EXPORT]', { lastUpdate, fileCount: archiveEntries.flat().length, fileSize: archiveEntries.flat().reduce((partialSum, a) => partialSum + a.data.length, 0) });
  } catch (err) {
    console.error('❌ /export failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Just an example: "Add desired member" as an API
app.get('/members/add', (req, res) => {
  const { memberName } = req.query;
  if (!memberName) {
    return res.status(400).json({ error: 'memberName is required' });
  }
  const success = addDesiredMember(memberName);
  if (success) {
    return res.json({ message: `${memberName} added` });
  } else {
    return res.status(500).json({ error: 'Unable to add member' });
  }
});


// Just an example: "Add desired member" as an API
app.get('/members/remove', (req, res) => {
  const { memberName } = req.query;
  if (!memberName) {
    return res.status(400).json({ error: 'memberName is required' });
  }
  const success = removeDesiredMember(memberName);
  if (success) {
    return res.json({ message: `${memberName} remove` });
  } else {
    return res.status(500).json({ error: 'Unable to remove member' });
  }
});

// Just an example: "Add desired member" as an API
app.get('/members', (req, res) => {
  const { memberName } = req.query;
  if (!memberName) {
    return res.status(400).json({ error: 'memberName is required' });
  }
  const success = removeDesiredMember(memberName);
  if (success) {
    return res.json({ message: `${memberName} remove` });
  } else {
    return res.status(500).json({ error: 'Unable to remove member' });
  }
});


console.log('Server will listen on these IP addresses:');
// Loop through each interface and its addresses



app.listen(port, () => {
  console.log(`Server listening on :`);
  Object.keys(interfaces).forEach((ifaceName) => {
    interfaces[ifaceName].forEach((iface) => {
      // Only consider IPv4 addresses that are not internal (i.e. not 127.0.0.1)
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`${ifaceName}: http://${iface.address}:${port}`);
      }
    });
  });
});


