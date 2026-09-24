const fs = require('fs');

// ფაილები, რომლებიც წინა სკრიპტის გამო დაზიანდა (სადაც index რეალურად გამოიყენება)
const filesToFix = [
  'components/virtual-office/EventFeed.tsx',
  'components/debug/DebugPanel.tsx',
  'app/page.tsx'
];

let fixedCount = 0;

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. EventFeed.tsx: თუ კოდში არის index === 0, მაგრამ .map-ში აკლია
  if (filePath.includes('EventFeed.tsx')) {
    content = content.replace(/events\.map\(\(event\)\s*=>/g, 'events.map((event, index) =>');
  }
  
  // 2. DebugPanel.tsx: files და errors სიებისთვის
  if (filePath.includes('DebugPanel.tsx')) {
    content = content.replace(/debugInfo\.files\.map\(\(file\)\s*=>/g, 'debugInfo.files.map((file, index) =>');
    content = content.replace(/debugInfo\.errors\.map\(\(error\)\s*=>/g, 'debugInfo.errors.map((error, index) =>');
  }

  // 3. app/page.tsx: nyxLogs-ისთვის
  if (filePath.includes('app/page.tsx')) {
    content = content.replace(/nyxLogs\.map\(\(log\)\s*=>/g, 'nyxLogs.map((log, index) =>');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ აღდგა index პარამეტრი: ${filePath}`);
    fixedCount++;
  }
});

console.log(`\n🎉 სულ შესწორდა ${fixedCount} ფაილი. ახლა Build წარმატებით უნდა დასრულდეს!`);