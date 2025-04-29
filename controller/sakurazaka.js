// sakurazaka.js
import {
  loadExistingBlogs,
  saveBlogsToFile,
  getHtmlDocument,
  parseDateTime,
  getElementInnerText,
  getBlogID,
  // Constants & config
  Sakurazaka46_BlogStatus_FilePath,
  Sakurazaka46_HomePage,
  DateFormats,
  IdolGroup,
  threadCount,
  parallelOptions,
} from '../global.js'; // Adjust the relative path to your global.js

// A container for the blog entries. In C#, this was a Dictionary<string, Blog>.
let Blogs = {};

/**
 * Equivalent to: public static void Sakurazaka46_Crawler()
 */
export async function Sakurazaka46_Crawler() {
  // Load existing blogs from JSON
  Blogs = loadExistingBlogs(Sakurazaka46_BlogStatus_FilePath);
  const oldBlogsCount = Object.keys(Blogs).length;

  // Create an array of "thread IDs" from 0..(threadCount-1).
  // Run them all in parallel with Promise.all
  const tasks = [];
  for (let i = 0; i < threadCount; i++) {
    tasks.push(processPages(i, threadCount));
  }
  await Promise.all(tasks);

  // Compare count before & after
  const newBlogsCount = Object.keys(Blogs).length;
  if (newBlogsCount > oldBlogsCount) {
    // If there are new blogs, save them
    saveBlogsToFile(
      Blogs,
      IdolGroup.Sakurazaka46, // "Sakurazaka46"
      Sakurazaka46_BlogStatus_FilePath
    );
  }

  const result = JSON.stringify(Blogs, null, 2);


  // Clear out the dictionary
  Blogs = {};

  return result;
}

/**
 * Equivalent to: private static void ProcessPages(int threadId, int threadCount)
 * Loop through pages from threadId to 1000 in steps of threadCount
 */
async function processPages(threadId, threadCount) {
  for (let currentPage = threadId; currentPage <= 1000; currentPage += threadCount) {
    try {
      console.log(`threadId [${threadId}] Processing Page ${currentPage}`);
      const url = `${Sakurazaka46_HomePage}/s/s46/diary/blog/list?ima=0000&page=${currentPage}`;

      const htmlDoc = await getHtmlDocument(url);
      if (htmlDoc) {
        // First, gather all <li class="box"> (in the broad sense of “contains box class”)
        const allLiBox = htmlDoc.querySelectorAll('li.box');
        if (!allLiBox || allLiBox.length === 0) {
          console.log(`Not found in Page ${currentPage}`);
          break; // No more results
        }

        // Now filter so that ONLY <li class="box"> is included
        // (i.e., exclude <li class="box something-else">)
        const exactLiBox = allLiBox.filter(
          node => node.getAttribute('class') === 'box'
        );
        if (exactLiBox.length === 0) {
          console.log(`No exact <li class="box"> found on Page ${currentPage}`);
          break;
        }

        for (const element of exactLiBox) {
          // If processBlog returns false, stop reading more from this page
          const shouldContinue = await processBlog(element, currentPage);
          if (!shouldContinue) {
            return;
          }
        }
      } else {
        console.log(`Not found in Page ${currentPage}`);
        break; // break out if no results on this page
      }
    } catch (ex) {
      console.log(`Error on Page ${currentPage}: ${ex.message}`);
      break;
    }
  }
}

/**
 * Equivalent to: private static bool ProcessBlog(HtmlNode element, int currentPage)
 */
async function processBlog(element, currentPage) {
  const startTime = Date.now();

  // The blog URL is from the first <a> child
  const aTag = element.querySelector("a");
  if (!aTag || !aTag.getAttribute("href")) {
    return true; // skip if no link is available
  }

  const hrefValue = aTag.getAttribute("href");
  const blogPath = `${Sakurazaka46_HomePage}${hrefValue}`;
  // Get member name from <p class="name"> element
  const blogMemberName = getElementInnerText(element, "p", "class", "name")
    .trim()
    .replace(/\s+/g, ""); // remove spaces

  const urlObj = new URL(blogPath);
  const blogID = getBlogID(urlObj.pathname);

  if (!Blogs[blogID]) {
    // This blog ID not yet in our dictionary
    const blogDoc = await getHtmlDocument(blogPath);
    if (
      blogDoc &&
      blogDoc.querySelector("div.box-article") &&
      blogDoc.querySelector("div.blog-foot")
    ) {
      const article = blogDoc.querySelector("div.box-article");
      const foot = blogDoc.querySelector("div.blog-foot");

      // Gather all <img src="...">
      const imageNodes = article.querySelectorAll("img");
      const imageList = imageNodes
        .map(img => img.getAttribute("src"))
        .filter(src => src);

      const blogDateTime = getElementInnerText(foot, "p", "class", "date wf-a");
      const blogTitle = getElementInnerText(element, "h3", "class", "title");

      // Save to our dictionary
      Blogs[blogID] = {
        ID: blogID,
        Name: blogMemberName,
        Title: blogTitle,
        DateTime: parseDateTime(blogDateTime, DateFormats[4]),
        ImageList: imageList,
      };

      const diff = (Date.now() - startTime) / 1000; // in seconds
      console.log(
        "\x1b[32m%s\x1b[0m",
        `Blog ID:[${blogID}][${blogMemberName}] ` +
        `Date:[${Blogs[blogID].DateTime.slice(0, 16).replace('T', ' ')}] ` +
        `ImgCount:[${imageList.length}] ` +
        `Page:[${currentPage}] ` +
        `ProcessingTime:[${diff.toFixed(3)}s]`
      );
      return true;
    } else {
      // Red text
      console.log(
        "\x1b[31m%s\x1b[0m",
        `Not found on Blog Id ${blogID} for Member ${blogMemberName}`
      );
      return false;
    }
  } else {
    // Yellow text
    console.log(
      "\x1b[33m%s\x1b[0m",
      `Duplicate Blog Id ${blogID} for Member ${blogMemberName} found on Page ${currentPage}`
    );
    return false;
  }
}
