// program.js
import fs from 'fs';
import promptSync from 'prompt-sync';
import {
  // from global.js
  Hinatazaka46_BlogStatus_FilePath,
  Sakurazaka46_BlogStatus_FilePath,
  Nogizaka46_BlogStatus_FilePath,
  Bokuao_BlogStatus_FilePath,
  getMembers,
  exportSingleMemberBlogImages,
  loadDesiredMemberList,
  addDesiredMember,
  removeDesiredMember,
  parseDateTime,
} from './global.js';

// If you keep your "controller" modules in a folder "controller", import them:
import { Hinatazaka46_Crawler } from './controller/hinatazaka.js';
import { Sakurazaka46_Crawler } from './controller/sakurazaka.js';
import { Nogizaka46_Crawler } from './controller/nogizaka.js';
import { Bokuao_Crawler } from './controller/bokuao.js';

// Create the prompt instance
const prompt = promptSync({ sigint: true });

// Utility: isDoubleWidth character check for table formatting
function isDoubleWidth(char) {
  const code = char.codePointAt(0);
  // Checking the ranges you used in .NET
  if (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2a6df) ||
    (code >= 0x2a700 && code <= 0x2b73f) ||
    (code >= 0x2b740 && code <= 0x2b81f) ||
    (code >= 0x2b820 && code <= 0x2ceaf) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0x2f800 && code <= 0x2fa1f) ||
    (code >= 0x3200 && code <= 0x32ff) ||
    (code >= 0x3300 && code <= 0x33ff) ||
    (code >= 0xff00 && code <= 0xffef) ||
    (code >= 0x3040 && code <= 0x309f) ||
    (code >= 0x30a0 && code <= 0x30ff) ||
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0x2000 && code <= 0x206f) ||
    (code >= 0x3000 && code <= 0x303f) ||
    (code >= 0xff00 && code <= 0xffef)
  ) {
    return true;
  }
  return false;
}

// padString - replicate your .NET PadString with CJK logic
function padString(input, width) {
  let inputWidth = 0;
  for (const c of input) {
    inputWidth += isDoubleWidth(c) ? 2 : 1;
  }
  const spaces = width - inputWidth;
  return input + (spaces > 0 ? ' '.repeat(spaces) : '');
}

// If you want a single function to gather all group members (like in your code):
function getFullMemberList() {
  return [
    ...getMembers(Hinatazaka46_BlogStatus_FilePath),
    ...getMembers(Sakurazaka46_BlogStatus_FilePath),
    ...getMembers(Nogizaka46_BlogStatus_FilePath),
    ...getMembers(Bokuao_BlogStatus_FilePath),
  ];
}

async function main() {
  // Make sure directories exist if needed
  [Hinatazaka46_BlogStatus_FilePath, Sakurazaka46_BlogStatus_FilePath, Nogizaka46_BlogStatus_FilePath, Bokuao_BlogStatus_FilePath].forEach(filePath => {
    const dir = filePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  let exit = false;
  while (!exit) {
    displayMainMenu();
    const chinput = getUserInput();
    switch (chinput) {
      case 'h':
        await Hinatazaka46_Crawler();
        break;
      case 's':
        await Sakurazaka46_Crawler();
        break;
      case 'n':
        await Nogizaka46_Crawler();
        break;
      case 'b':
        await Bokuao_Crawler();
        break;
      case 'e':
        await exportSingleMemberImages();
        break;
      case 'a':
        await manageDesiredMembers();
        break;
      default:
        console.log("Unknown MainPage Command:");
        break;
    }
    console.log("End");
  }
}

function displayMainMenu() {
  console.log("Welcome. Please Select Function:");
  console.log("h: load all Hinatazaka46 blog");
  console.log("s: load all Sakurazaka46 blog");
  console.log("n: load all Nogizaka46 blog");
  console.log("b: load all Bokuao blog");
  console.log("e: Export all blog image of single Member");
  console.log("a: Export all blog image of desired Members");
  console.log("================================================================================");
}

function getUserInput() {
  const line = prompt("> ");
  if (!line) return '\0';
  return line[0];
}

async function exportSingleMemberImages() {
  console.log("Select Group:");
  console.log("h: Hinatazaka46");
  console.log("s: Sakurazaka46");
  console.log("n: Nogizaka46");
  console.log("b: Bokuao");
  console.log("================================================================================");

  const chinput = getUserInput();
  let memberList = [];
  switch (chinput) {
    case 'h':
      memberList = getMembers(Hinatazaka46_BlogStatus_FilePath);
      break;
    case 's':
      memberList = getMembers(Sakurazaka46_BlogStatus_FilePath);
      break;
    case 'n':
      memberList = getMembers(Nogizaka46_BlogStatus_FilePath);
      break;
    case 'b':
      memberList = getMembers(Bokuao_BlogStatus_FilePath);
      break;
    default:
      console.log("Unknown Command.");
      return;
  }
  selectAndExportMemberImages(memberList);
}

function selectAndExportMemberImages(memberList) {
  console.log("Select Member:");
  memberList.forEach((member, i) => {
    console.log(`${i + 1} : ${member.Name}`);
  });
  console.log("================================================================================");

  const line = prompt("> ");
  if (!line) return;
  const num = parseInt(line, 10);
  if (num > 0 && num <= memberList.length) {
    const selectedMember = memberList[num - 1];
    exportSingleMemberBlogImages(selectedMember);
  } else {
    console.log("Unknown Command.");
  }
}

async function manageDesiredMembers() {
  let desiredPageExit = false;
  while (!desiredPageExit) {
    const fullMemberList = getFullMemberList();
    const selectedDesiredMembers = loadDesiredMemberList();
    const memberListView = createMemberListView(fullMemberList, selectedDesiredMembers);

    displayTable(memberListView);
    displayDesiredMemberMenu();

    const chinput = getUserInput();
    switch (chinput) {
      case 'a':
        addDesiredMemberHandler(fullMemberList);
        break;
      case 'r':
        removeDesiredMemberHandler(fullMemberList);
        break;
      case 'e':
        exportDesiredMembers(fullMemberList, selectedDesiredMembers);
        break;
      case 'd':
        await exportDesiredMembersBeforeDate(fullMemberList, selectedDesiredMembers);
        break;
      case 'x':
        desiredPageExit = true;
        break;
      default:
        console.log("Unknown Command.");
        break;
    }
  }
}

function createMemberListView(fullMemberList, selectedDesiredMembers) {
  return fullMemberList.map((member, index) => {
    const isSelected = selectedDesiredMembers.includes(member.Name);
    return `${index + 1}.${isSelected ? `[${member.Name}]` : member.Name}`;
  });
}

function displayTable(memberListView) {
  const columnCount = 5;
  const rowCount = Math.ceil(memberListView.length / columnCount);
  const table = [];
  for (let i = 0; i < rowCount; i++) {
    table.push(memberListView.slice(i * columnCount, i * columnCount + columnCount));
  }

  // measure column widths
  const columnWidths = new Array(columnCount).fill(0);
  for (const row of table) {
    row.forEach((cell, colIdx) => {
      let cwidth = 0;
      for (const ch of cell) {
        cwidth += isDoubleWidth(ch) ? 2 : 1;
      }
      columnWidths[colIdx] = Math.max(columnWidths[colIdx], cwidth);
    });
  }

  // Print each row
  for (const row of table) {
    let line = '';
    for (let i = 0; i < row.length; i++) {
      line += padString(row[i], columnWidths[i] + 1);
    }
    console.log(line);
  }
}

function displayDesiredMemberMenu() {
  console.log("Select Function:");
  console.log("a: add desired member");
  console.log("r: remove desired member");
  console.log("e: Export");
  console.log("d: Export before Date (yyyyMMdd)");
  console.log("x: Exit");
  console.log("================================================================================");
}

function addDesiredMemberHandler(fullMemberList) {
  console.log("Select Member to Add:");
  const line = prompt("> ");
  if (!line) return;
  const num = parseInt(line, 10);
  if (num > 0 && num <= fullMemberList.length) {
    const selectedMember = fullMemberList[num - 1];
    const res = addDesiredMember(selectedMember.Name);
    console.log(`Add ${selectedMember.Name} Result: ${res ? "Success" : "Fail"}`);
  } else {
    console.log("Unknown Command.");
  }
}

function removeDesiredMemberHandler(fullMemberList) {
  console.log("Select Member to Remove:");
  const line = prompt("> ");
  if (!line) return;
  const num = parseInt(line, 10);
  if (num > 0 && num <= fullMemberList.length) {
    const selectedMember = fullMemberList[num - 1];
    const res = removeDesiredMember(selectedMember.Name);
    console.log(`Remove ${selectedMember.Name} Result: ${res ? "Success" : "Fail"}`);
  } else {
    console.log("Unknown Command.");
  }
}

function exportDesiredMembers(fullMemberList, selectedDesiredMembers) {
  // "Parallel" in Node is typically Promise.all. We'll do it synchronously for clarity:
  // If you want concurrency, you can do a concurrency-limited approach with p-limit, etc.
  const membersToExport = fullMemberList.filter(m => selectedDesiredMembers.includes(m.Name));
  Promise.all(membersToExport.map(m => exportSingleMemberBlogImages(m)))
    .then(() => console.log("Export of desired members complete."));
}

async function exportDesiredMembersBeforeDate(fullMemberList, selectedDesiredMembers) {
  console.log("Enter the Date (yyyyMMdd):");
  const line = prompt("> ");
  let lastUpdate = parseDateTime(line, "yyyyMMdd");
  if (!lastUpdate) {
    // fallback
    lastUpdate = new Date(Date.now() - 8 * 24 * 3600 * 1000);
  }

  const membersToExport = fullMemberList.filter(m => selectedDesiredMembers.includes(m.Name));
  await Promise.all(membersToExport.map(m => exportSingleMemberBlogImages(m, lastUpdate)))
    .then(() => console.log("Export of desired members before date complete."));
}

// Start the program
main().catch(err => console.error("Error in main:", err));
