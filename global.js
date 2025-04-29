// global.js
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { parse as parseHtml } from 'node-html-parser';
/**
 * Replace these constants with your own paths and configuration
 * as needed. They mirror your .NET code.
 */

// JSON "options"
export const jsonSerializerOptions = {
  // Node doesn't have a direct counterpart to .NET's JavaScriptEncoder,
  // but we can do pretty-print with JSON.stringify(value, null, 2).
};

// Thread/concurrency count
export const threadCount = os.cpus().length;

// ParallelOptions in .NET is replaced by a concurrency concept in Node.
// We'll just store the numeric concurrency here:
export const parallelOptions = { maxDegreeOfParallelism: threadCount };

// Home pages
export const Sakurazaka46_HomePage = 'https://sakurazaka46.com';
export const Hinatazaka46_HomePage = 'https://hinatazaka46.com';
export const Nogizaka46_HomePage = 'https://nogizaka46.com';
export const Bokuao_HomePage = 'https://bokuao.com';

// Folder paths, mirroring your .NET code
export const PicturesFolderPath = './';
export const BlogStatus_FilePath = 'BlogStatus.JSON';

export const Hinatazaka46_Images_FilePath = path.join(PicturesFolderPath, 'Hinatazaka46_Images');
export const Sakurazaka46_Images_FilePath = path.join(PicturesFolderPath, 'Sakurazaka46_Images');
export const Nogizaka46_Images_FilePath = path.join(PicturesFolderPath, 'Nogizaka46_Images');
export const Bokuao_Images_FilePath = path.join(PicturesFolderPath, 'Bokuao_Images');

export const Hinatazaka46_BlogStatus_FilePath = path.join(Hinatazaka46_Images_FilePath, BlogStatus_FilePath);
export const Sakurazaka46_BlogStatus_FilePath = path.join(Sakurazaka46_Images_FilePath, BlogStatus_FilePath);
export const Nogizaka46_BlogStatus_FilePath = path.join(Nogizaka46_Images_FilePath, BlogStatus_FilePath);
export const Bokuao_BlogStatus_FilePath = path.join(Bokuao_Images_FilePath, BlogStatus_FilePath);

export const ExportFilePath = path.join(PicturesFolderPath, 'Export');
export const ForPhonePath = path.join(PicturesFolderPath, 'ForPhone');
export const Desired_MemberList_FilePath = 'Desired_Member_List.JSON';

// Various date formats you used in .NET
export const DateFormats = [
  'yyyy.M.d HH:mm',
  'yyyy/M/d',
  'yyyy/MM/dd HH:mm:ss',
  'yyyy.MM.dd',
  'yyyy/MM/dd HH:mm',
];

// An enumeration for idol groups
export const IdolGroup = Object.freeze({
  Nogizaka46: 'Nogizaka46',
  Sakurazaka46: 'Sakurazaka46',
  Hinatazaka46: 'Hinatazaka46',
  Bokuao: 'Bokuao',
});

/**
 * HTTP request function, replicating GetHttpResponse in .NET
 * We pass 'GET' or 'POST' etc. as httpMethod.
 * cookies should be an array of { Name, Value } objects, which we
 * convert to a "Cookie" header, e.g. "Name=Value; Name2=Value2"
 */
export async function getHttpResponse(uri, httpMethod, jsonData = null, cookies = null) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    Accept: 'application/json',
  };
  if (cookies && cookies.length > 0) {
    const cookieStr = cookies.map((c) => `${c.Name}=${c.Value}`).join('; ');
    headers.Cookie = cookieStr;
  }

  const axiosOptions = {
    url: uri,
    method: httpMethod,
    headers,
  };
  if (jsonData) {
    axiosOptions.data = jsonData;
  }

  // Perform the request with Axios
  const response = await axios(axiosOptions);
  return response;
}

/**
 * getHtmlDocument:
 * - calls getHttpResponse(...) for a GET request
 * - returns parsed HTML (via node-html-parser), or null on error
 */
export async function getHtmlDocument(urlAddress, cookies = null, blogId = null) {
  try {
    const response = await getHttpResponse(urlAddress, 'GET', null, cookies);
    if (response.status === 200) {
      if (blogId) {
        fs.writeFileSync(
          path.join(ExportFilePath, `${blogId}.html`),
          response.data,
          'utf-8'
        );
      }
      return parseHtml(response.data);
    }
  } catch (err) {
    console.error(`Error fetching or parsing ${urlAddress}: ${err.message}`);
  }
  return null;
}

/**
 * Utility: parse a date/time string using one of your date formats.
 * In .NET, you used `DateTime.ParseExact(..., dateFormat, CultureInfo.GetCultureInfo("ja"), ...)`.
 * We'll do a simpler approach with standard JS. If you need more robust
 * behavior, consider "dayjs" or "moment" packages.
 *
 * `japanTime` means if we want to subtract one hour or do something special;
 * your example does "return japanTime ? dateValue.AddHours(-1) : dateValue;"
 * We'll replicate that by subtracting 1 hour if `japanTime` is true, to match your .NET code.
 */
export function parseDateTime(dateString, dateFormat, japanTime = false) {
  let dt;

  // Check if the user is requesting the "yyyyMMdd" format
  if (dateFormat === "yyyyMMdd") {
    // e.g., "20250315"
    if (dateString.length === 8) {
      const year = parseInt(dateString.slice(0, 4), 10);
      const month = parseInt(dateString.slice(4, 6), 10);
      const day = parseInt(dateString.slice(6, 8), 10);

      // Construct a JS date. Note: months are 0-indexed in JS
      dt = new Date(year, month - 1, day);
    } else {
      // Fallback if the string isn't length 8 – attempt a normal parse
      dt = new Date(dateString);
    }
  } else {
    // Existing logic for other formats, e.g. "yyyy/MM/dd HH:mm:ss"
    // We'll do a naive parse by replacing "." with "/"
    // or handle your other known patterns
    const normalized = dateString.replace(/\./g, "/");
    dt = new Date(normalized);
  }

  // If dt is invalid (NaN), handle it:
  if (isNaN(dt.getTime())) {
    console.error(`Unable to convert '${dateString}' with format '${dateFormat}'.`);
    return null
  }

  // If we want to subtract 1 hour for "japanTime", as in your .NET code:
  if (japanTime) {
    dt.setHours(dt.getHours() - 1);
  }

  return formatDateTimeWithOffset(dt);
}

/**
 * Convert a Date object to an ISO8601 string with the local timezone offset,
 * e.g. "2020-10-19T21:07:00+08:00"
 */
function formatDateTimeWithOffset(dt) {
  // Extract local date/time
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  const hour = String(dt.getHours()).padStart(2, '0');
  const minute = String(dt.getMinutes()).padStart(2, '0');
  const second = String(dt.getSeconds()).padStart(2, '0');

  // Compute local time zone offset in minutes. 
  // e.g. For UTC+8, getTimezoneOffset() might be -480
  //const offsetMinutes = dt.getTimezoneOffset();

  // A negative offset means we're "ahead" of UTC, so sign is "+"
  //const offsetSign = offsetMinutes <= 0 ? '+' : '-';

  // The absolute offset in minutes
  // const offsetAbs = Math.abs(offsetMinutes);
  // const offsetH = String(Math.floor(offsetAbs / 60)).padStart(2, '0');
  const offset = "+08:00";

  // Build final string
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
}


/**
 * getMembers: read a JSON file that is an array of Member objects.
 * If not found or fails, return an empty array.
 */
export function getMembers(blogStatusFilePath) {
  try {
    if (!fs.existsSync(blogStatusFilePath)) {
      return [];
    }
    const data = fs.readFileSync(blogStatusFilePath, 'utf-8');
    const members = JSON.parse(data);
    return members || [];
  } catch (err) {
    console.error(`Error reading members from ${blogStatusFilePath}:`, err);
    return [];
  }
}

/**
 * Save an object mapping { blogID -> Blog } or an array of Members
 * to a given BlogStatus file, grouped by member.
 * This is basically your SaveBlogsToFile method, but we typically
 * do that in the crawler code. Provided if needed.
 */
export function saveBlogsToFile(blogMap, groupName, blogStatusFilePath) {
  const blogArray = Object.values(blogMap);
  // Group by blog.Name
  const grouped = {};
  for (const b of blogArray) {
    if (!grouped[b.Name]) {
      grouped[b.Name] = [];
    }
    grouped[b.Name].push(b);
  }

  // Sort each group by date ascending, build array of members
  const newMembers = Object.keys(grouped).map((memberName) => {
    const sortedBlogs = grouped[memberName].sort(
      (a, b) => a.DateTime - b.DateTime
    );
    return {
      Name: memberName,
      Group: groupName,
      BlogList: sortedBlogs,
    };
  });

  fs.writeFileSync(
    blogStatusFilePath,
    JSON.stringify(newMembers, null, 2),
    'utf-8'
  );
}

/**
 * loadExistingBlogs:
 * read members from a file, flatten all their blogs into an object keyed by blog.ID
 */
export function loadExistingBlogs(blogStatusFilePath) {
  const members = getMembers(blogStatusFilePath);
  const dict = {};
  for (const m of members) {
    for (const b of m.BlogList) {
      dict[b.ID] = b;
    }
  }
  return dict;
}

/**
 * getElementInnerText - equivalent to your C# method for reading an HTML element's text:
 *     public static string GetElementInnerText(HtmlNode element, string tag, string className, string attributeValue)
 * We replicate that logic here. The node-html-parser library has its own
 * methods, so we can do a best-effort approach:
 */
export function getElementInnerText(element, tag, attrName, attrValue) {
  if (!element) return "Unknown";
  // find <tag ... attrName="attrValue" >
  const found = element.querySelector(`${tag}[${attrName}='${attrValue}']`);
  if (!found) return "Unknown";
  return found.text.trim();
}

/**
 * getBlogID - slice a path or something. 
 * In your C# code: 
 *   public static string GetBlogID(string articleUrl) => articleUrl[(articleUrl.LastIndexOf('/') + 1)..];
 */
export function getBlogID(articlePath) {
  const slashIndex = articlePath.lastIndexOf('/');
  if (slashIndex < 0) return articlePath;
  return articlePath.substring(slashIndex + 1);
}

/**
 * For image saving, exporting single members, etc., you have more advanced
 * methods in your code. We'll keep them here. Adjust as needed.
 */

// Simple array for valid image file extensions
const sourceExtensions = ['.jpeg', '.jpg', '.png', '.gif'];

/**
 * Returns the home page URL for each group
 */
function getHomePageByGroup(group) {
  const map = {
    [IdolGroup.Nogizaka46]: Nogizaka46_HomePage,
    [IdolGroup.Sakurazaka46]: Sakurazaka46_HomePage,
    [IdolGroup.Bokuao]: Bokuao_HomePage,
  };
  return map[group] || '';
}

/**
 * Returns the folder name for each group
 */
function getFolderNameByGroup(group) {
  const map = {
    [IdolGroup.Nogizaka46]: '◢乃木坂46',
    [IdolGroup.Sakurazaka46]: '◢櫻坂46',
    [IdolGroup.Hinatazaka46]: '◢日向坂46',
    [IdolGroup.Bokuao]: '僕青',
  };
  return map[group] || 'Unknown';
}

/**
 * Attempt to download an image from a URL (up to `retries` times).
 * @return {Buffer|null} Array buffer on success, or null on failure
 */
async function loadUrlData(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      if (response.status === 200) {
        return response.data;
      } else {
        console.error(`Failed with status ${response.status}. Retry: ${i}`);
      }
    } catch (ex) {
      console.error(`Connect to ${url} Fail: ${ex.message} Retry: ${i}`);
    }
  }
  return null;
}

/**
 * Returns a sanitized file name (handles special cases).
 */
function sanitizeFileName(base, extension, id) {
  if (!base) base = '';
  const fileExamples = ['0000', '0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009'];
  if (fileExamples.includes(base)) {
    return `${id}_${base}${extension}`;
  } else if (base.length > 52) {
    return base.substring(0, 52) + extension;
  }
  return base + extension;
}

/**
 * Filters member blogs by `lastUpdate` if provided
 */
function filterBlogListByDate(blogList, lastUpdate) {
  if (!lastUpdate) return blogList;
  const cutoff = new Date(lastUpdate);
  return blogList.filter((b) => new Date(b.DateTime) >= cutoff);
}

/**
 * Example `saveImage` function. Adjust to your actual implementation.
 */
async function saveImage(url, folderPath, date, blogID) {
  // Just a placeholder
  try {
    // Possibly your own code that uses axios or another library
    // to download the image to `folderPath`.
    const ext = path.extname(url).toLowerCase();
    const base = path.basename(url, ext);
    const fileName = sanitizeFileName(base, ext, blogID);
    const imgFileName = path.join(folderPath, fileName)

    if (fs.existsSync(imgFileName)) {
      const t = date.getTime() / 1000;
      fs.utimesSync(imgFileName, t, t);
      return true;
    }


    const data = await loadUrlData(url);
    if (!data) return false;



    fs.writeFileSync(imgFileName, data);
    const t = date.getTime() / 1000;
    fs.utimesSync(imgFileName, t, t);
    return true;
  } catch (ex) {
    console.error(`saveImage error for ${url}: `, ex.message);
    return false;
  }
}


/**
 * exportSingleMemberBlogImages: replicates your C# Export_SingleMember_BlogImages
 * usage:
 *    await exportSingleMemberBlogImages(selectedMember, optionalLastUpdateDate)
 */

/**
 * 1) Exports images to local filesystem
 */
export async function exportSingleMemberBlogImages(
  member,
  lastUpdate = null,
  exportFolder = ExportFilePath
) {
  // Filter blog list by lastUpdate
  let blogList = filterBlogListByDate(member.BlogList, lastUpdate);
  if (!blogList.length) return;

  // Derive paths
  const homePage = getHomePageByGroup(member.Group);
  const folderName = getFolderNameByGroup(member.Group);
  const imgFolderPath = path.join(exportFolder, folderName, member.Name);

  if (!fs.existsSync(imgFolderPath)) {
    fs.mkdirSync(imgFolderPath, { recursive: true });
  }

  // Process each blog in parallel
  await Promise.all(
    blogList.map(async (blog) => {
      const { DateTime, ImageList, Name, Title, ID } = blog;
      if (!ImageList || !ImageList.length) return;

      let successAll = true;
      await Promise.all(
        ImageList.map(async (imgRel) => {
          const fullUrl = `${homePage}${imgRel}`;
          const ok = await saveImage(fullUrl, imgFolderPath, new Date(new Date(DateTime).getTime()), ID);
          if (!ok) successAll = false;
        })
      );

      if (successAll) {
        console.log(
          `Saved ${Name} blog [${Title}] ${new Date(DateTime)
            .toISOString()
            .slice(0, 10)} ImageCount:${ImageList.length}`
        );
      }
    })
  );

  console.log(`Export Result: ${member.Name} Success`);
}

/**
 * 2) Fetches images and returns them as an array (archiveList) 
 *    rather than saving to the filesystem.
 */
export async function appendSingleMemberBlogImagesToArchive(member, lastUpdate = null) {
  const archiveList = [];
  let blogList = filterBlogListByDate(member.BlogList, lastUpdate);
  if (!blogList.length) return [];

  // Derive paths
  const homePage = getHomePageByGroup(member.Group);
  const folderName = getFolderNameByGroup(member.Group);
  const imgFolderPath = path.join(folderName, member.Name);

  // Process each blog in parallel
  await Promise.all(
    blogList.map(async (blog) => {
      const { DateTime, ImageList, Name, Title, ID } = blog;
      if (!ImageList || !ImageList.length) return;

      const blogDate = new Date(DateTime);

      let successAll = true;
      await Promise.all(
        ImageList.map(async (imgRel) => {
          const imgFileUrl = `${homePage}${imgRel}`;
          const extension = path.extname(imgFileUrl).toLowerCase();

          // skip non-image (by your definition)
          if (!sourceExtensions.includes(extension)) {
            return;
          }

          // Build final file name
          let baseName = path.basename(imgFileUrl, extension);
          const finalFileName = sanitizeFileName(baseName, extension, ID);
          const fullImageName = path.join(imgFolderPath, finalFileName);

          // Attempt to download
          const data = await loadUrlData(imgFileUrl, 3);
          if (data) {
            archiveList.push({
              data: data,
              name: fullImageName,
              date: new Date(blogDate.getTime() + 8 * 60 * 60 * 1000),
            });
          } else {
            successAll = false;
          }
        })
      );

      if (successAll) {
        console.log(
          `Saved ${Name} blog [${Title}] ${blogDate} ImageCount:${ImageList.length}`
        );
      }
    })
  );

  if (archiveList.length > 0) {
    console.log(`Export Result: ${member.Name} Success`);
  }
  return archiveList;
}
/**
 * saveImage: a function to download an image by URL, store it to disk,
 * and set file times. 
 */
// export async function saveImage(imgFileUrl, imgFilePath, dateTime, id) {
//   const extension = path.extname(imgFileUrl).toLowerCase();
//   if (!sourceExtensions.includes(extension)) {
//     return false;
//   }

//   let fileName = path.basename(imgFileUrl, extension);
//   if (!fileName) fileName = '';

//   const fileExamples = [
//     '0000', '0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009'
//   ];
//   if (fileExamples.includes(fileName)) {
//     fileName = `${id}_${fileName}`;
//   } else if (fileName.length > 52) {
//     fileName = fileName.substring(0, 52);
//   }

//   const imgFileName = path.join(imgFilePath, fileName + extension);

//   // If file already exists, just update times
//   if (fs.existsSync(imgFileName)) {
//     const t = dateTime.getTime() / 1000;
//     fs.utimesSync(imgFileName, t, t);
//     return true;
//   }

//   for (let i = 0; i < 3; i++) {
//     try {
//       const response = await axios.get(imgFileUrl, { responseType: 'arraybuffer' });
//       if (response.status !== 200) {
//         console.error(
//           `Connect to ${imgFileUrl} failed with status ${response.status}. Retry: ${i}`
//         );
//         continue;
//       }
//       fs.writeFileSync(imgFileName, response.data);
//       const t = dateTime.getTime() / 1000;
//       fs.utimesSync(imgFileName, t, t);
//       return true;
//     } catch (ex) {
//       console.error(`Connect to ${imgFileUrl} Fail: ${ex.message} Retry: ${i}`);
//     }
//   }
//   return false;
// }

/**
 * Managing a "desired member" list
 */
export function loadDesiredMemberList() {
  try {
    if (!fs.existsSync(ExportFilePath)) {
      fs.mkdirSync(ExportFilePath, { recursive: true });
    }
    if (!fs.existsSync(Desired_MemberList_FilePath)) {
      return [];
    }
    const data = fs.readFileSync(Desired_MemberList_FilePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Load_Desired_MemberList error: ${err.message}`);
    return [];
  }
}

export function addDesiredMember(memberName) {
  try {
    if (!fs.existsSync(ExportFilePath)) {
      fs.mkdirSync(ExportFilePath, { recursive: true });
    }
    let desiredList = [];
    if (fs.existsSync(Desired_MemberList_FilePath)) {
      desiredList = JSON.parse(
        fs.readFileSync(Desired_MemberList_FilePath, 'utf-8')
      );
    }
    desiredList.push(memberName);
    fs.writeFileSync(
      Desired_MemberList_FilePath,
      JSON.stringify(desiredList, null, 2),
      'utf-8'
    );
    return true;
  } catch (err) {
    console.error(`addDesiredMember error: ${err.message}`);
    return false;
  }
}

export function removeDesiredMember(memberName) {
  try {
    if (!fs.existsSync(ExportFilePath)) {
      fs.mkdirSync(ExportFilePath, { recursive: true });
    }
    if (!fs.existsSync(Desired_MemberList_FilePath)) return false;

    const desiredList = JSON.parse(
      fs.readFileSync(Desired_MemberList_FilePath, 'utf-8')
    );
    const index = desiredList.indexOf(memberName);
    if (index === -1) return false;
    desiredList.splice(index, 1);
    fs.writeFileSync(
      Desired_MemberList_FilePath,
      JSON.stringify(desiredList, null, 2),
      'utf-8'
    );
    return true;
  } catch (err) {
    console.error(`removeDesiredMember error: ${err.message}`);
    return false;
  }
}
