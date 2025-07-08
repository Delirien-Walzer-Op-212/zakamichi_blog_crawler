// hinatazaka.js
import fs from 'fs';
import {
    loadExistingBlogs,
    saveBlogsToFile,
    getHtmlDocument,
    parseDateTime,
    getElementInnerText,
    getBlogID,
    getJsonList,

    // Constants from global.js
    Hinatazaka46_BlogStatus_FilePath,
    Hinatazaka46_History_FilePath,
    Hinatazaka46_HomePage,
    DateFormats,
    IdolGroup,
    threadCount,
    getJson,
} from '../global.js'; // <-- Adjust path to your global.js

// This object holds your blog entries, keyed by blog ID
let Blogs = {};

const Hinatazaka46_Members = {
    '五期生リレー': [
        '大野愛実', '鶴崎仁香', '坂井新奈', '佐藤優羽',
        '下田衣珠季', '片山紗希', '大田美月', '高井俐香',
        '松尾桜', '蔵盛妃那乃'
    ]
};


/**
 * Equivalent to: public static void Hinatazaka46_Crawler()
 */
export async function Hinatazaka46_Crawler() {
    // Load existing blogs from file
    Blogs = loadExistingBlogs(Hinatazaka46_BlogStatus_FilePath);
    const oldBlogsCount = Object.keys(Blogs).length;

    // Create an array of tasks for each “thread ID” from 0..threadCount-1
    const tasks = [];
    for (let i = 0; i < threadCount; i++) {
        tasks.push(processPages(i, threadCount));
    }
    // Run them all concurrently
    await Promise.all(tasks);

    // Compare the new count with the old
    const newBlogsCount = Object.keys(Blogs).length;

    if (newBlogsCount > oldBlogsCount) {
        // If there are new blogs, save them to file
        saveBlogsToFile(Blogs, IdolGroup.Hinatazaka46, Hinatazaka46_BlogStatus_FilePath, Hinatazaka46_Members);
    }

    const result = JSON.stringify(Blogs, null, 2);

    // Clear out the dictionary
    Blogs = {};

    return result;
}

export async function Hinatazaka46_History_Crawler() {
    let history_photos_col = getJsonList(Hinatazaka46_History_FilePath);
    const indexs = history_photos_col.map(col => col.col_index);
    const max_col_index = Math.max(...indexs);
    for (let col_index = 1; col_index <= max_col_index + 5; col_index++) {
        try {
            if (history_photos_col.find(col => col.col_index == col_index)) {
                continue;
            }
            const code = `fc_photo_${col_index}`
            const url = `${Hinatazaka46_HomePage}/s/official/api/list/history?ct=${code}`;
            const json = await getJson(url);
            if (json && json.history_photo && json.history_photo.length > 0) {
                const history_photos = json.history_photo
                const title = history_photos[0].title.split('[')[0]
                const imageList = history_photos.map((photo, photo_index) => ({
                    photo_index,
                    image_src: photo.image_src.replace('/750_750_102400', ''),
                    title: photo.code + '.jpg'
                }));
                history_photos_col.push({
                    col_index,
                    title,
                    code,
                    imageList
                })
            }
        } catch (ex) {
            console.log(`Error on Page ${col_index}: ${ex.message}`);
            break;
        }
    }

    fs.writeFileSync(
        Hinatazaka46_History_FilePath,
        JSON.stringify(history_photos_col, null, 2),
        'utf-8'
    );
    return history_photos_col;
}



/**
 * Equivalent to: private static void ProcessPages(int threadId, int threadCount)
 */
async function processPages(threadId, threadCount) {
    for (let currentPage = threadId; currentPage <= 1000; currentPage += threadCount) {
        try {
            //console.log(`threadId [${threadId}] Processing Page ${currentPage}`);
            const url = `${Hinatazaka46_HomePage}/s/official/diary/member/list?page=${currentPage}`;

            const htmlDoc = await getHtmlDocument(url);
            if (
                htmlDoc &&
                htmlDoc.querySelectorAll(".p-blog-group > .p-blog-article").length > 0
            ) {
                // For each .p-blog-article inside .p-blog-group
                const articleNodes = htmlDoc.querySelectorAll(".p-blog-group > .p-blog-article");
                for (const element of articleNodes) {
                    // If processBlog returns false, we stop processing further on this page
                    const shouldContinue = await processBlog(element, currentPage);
                    if (!shouldContinue) {
                        return;
                    }
                }
            } else {
                console.log(`Not found in Page ${currentPage}`);
                break; // No more pages to process if not found
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

    // Construct the full blog path by looking for <a class="c-button-blog-detail">
    const linkTag = element.querySelector("a.c-button-blog-detail");
    const linkHref = linkTag ? linkTag.getAttribute("href") : "/00000";
    const blogPath = `${Hinatazaka46_HomePage}${linkHref}`;

    // Get blog’s member name from <div class="c-blog-article__name">
    const blogMemberName = getElementInnerText(element, "div", "class", "c-blog-article__name")
        .trim()
        .replace(/\s+/g, "");

    // Convert that path to an ID, e.g., /s/official/diary/xxxxx -> "xxxxx"
    const urlObj = new URL(blogPath);
    const blogID = getBlogID(urlObj.pathname);

    // Only proceed if this blog ID isn’t already in the dictionary
    if (!Blogs[blogID]) {
        // Title & Date from the same element
        const blogTitle = getElementInnerText(element, "div", "class", "c-blog-article__title");
        const blogDateTime = getElementInnerText(element, "div", "class", "c-blog-article__date");

        // The blog text area to find images
        const blogInnerTextNode = element.querySelector("div.c-blog-article__text");

        // Gather <img src="..."> from the text area
        let imageList = blogInnerTextNode
            ? blogInnerTextNode
                .querySelectorAll("img")
                .map((img) => img.getAttribute("src"))
                .filter((src) => src)
            : [];

        // If we suspect too many images, refetch from the blog page directly
        if (imageList.length > 20) {
            console.log("\x1b[33m%s\x1b[0m", "Warning! Too many images.");
            const fullDoc = await getHtmlDocument(blogPath);
            const fullTextNode = fullDoc
                ? fullDoc.querySelector("div.c-blog-article__text")
                : null;
            if (fullTextNode) {
                imageList = fullTextNode
                    .querySelectorAll("img")
                    .map((img) => img.getAttribute("src"))
                    .filter((src) => src);
            }
        }

        // Construct the Blog object
        const blogObj = {
            ID: blogID,
            Name: blogMemberName,
            Title: blogTitle,
            DateTime: parseDateTime(blogDateTime, DateFormats[0], true), // japanTime: true
            ImageList: imageList,
        };

        Blogs[blogID] = blogObj;

        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(3);
        console.log(
            "\x1b[32m%s\x1b[0m",
            `Blog ID:[${blogID}][${blogMemberName}] ` +
            `Date:[${blogObj.DateTime.slice(0, 16).replace('T', ' ')}] ` +
            `ImgCount:[${imageList.length}] ` +
            `Page:[${currentPage}] ` +
            `ProcessingTime:[${elapsedSec}s]`
        );
        return true;
    } else {
        // If blog already known, skip
        //console.log("\x1b[33m%s\x1b[0m",`Duplicate Blog Id ${blogID} for Member ${blogMemberName} found on Page ${currentPage}`);
        return false;
    }
}
