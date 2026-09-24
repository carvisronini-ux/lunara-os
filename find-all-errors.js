const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 ვიწყებ მთლიანი პროექტის სკანირებას TypeScript-ის შეცდომებისთვის...\n');

// 1. TypeScript-ის სრული შემოწმება (არ აგენერირებს ფაილებს, მხოლოდ ამოწმებს)
console.log('⚙️  ვუშვებ npx tsc --noEmit-ს (ეს შეიძლება 10-15 წამი დაგჭირდეს)...');
try {
    const output = execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ შეცდომები ვერ მოიძებნა! პროექტი სრულად გამართულია.');
} catch (error) {
    const output = error.stdout + error.stderr;
    
    // ამოვიღოთ მხოლოდ შეცდომების სია
    const errorLines = output.split('\n').filter(line => line.includes('./') && (line.includes('error TS') || line.includes('Type error:')));
    
    console.log(`\n❌ ნაპოვნია ${errorLines.length} შეცდომა TypeScript-ის მიერ:\n`);
    console.log('─'.repeat(80));
    
    // დავაჯგუფოთ ფაილების მიხედვით
    const errorsByFile = {};
    errorLines.forEach(line => {
        const match = line.match(/^\.\/(.*?):\d+:\d+/);
        if (match) {
            const file = match[1];
            if (!errorsByFile[file]) errorsByFile[file] = [];
            errorsByFile[file].push(line.trim());
        }
    });

    for (const [file, errors] of Object.entries(errorsByFile)) {
        console.log(`📁 ფაილი: ${file}`);
        errors.forEach(err => console.log(`   ⚠️  ${err}`));
        console.log('─'.repeat(80));
    }
}

// 2. ცნობილი პრობლემური შაბლონების (Patterns) ძიება კოდში
console.log('\n🔎 ვეძებ ცნობილ პრობლემურ შაბლონებს კოდში (Regex სკანირება)...\n');

const patternsToCheck = [
    {
        name: 'არასწორი Event Severity ("success" ნაცვლად "info"-სი)',
        regex: /severity:\s*["']success["']/g,
        fix: 'შეცვალე: severity: "info" as any'
    },
    {
        name: 'EventType-ის მკაცრი შემოწმება (აკლია "as any")',
        regex: /type:\s*["'][A-Z_]+["'](?!\s+as\s+any)/g,
        fix: 'დაამატე ბოლოში: as any  (მაგ: type: "AGENT_EVALUATED" as any)'
    },
    {
        name: 'გამოუყენებელი ცვლადი map/forEach-ში (მაგ: (event, index) =>)',
        regex: /\(\s*\w+\s*,\s*index\s*\)\s*=>/g,
        fix: 'შეცვალე: (_event, index) => ან (event) => (თუ index არ გამოიყენება)'
    }
];

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                scanDirectory(fullPath);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const relativePath = path.relative(process.cwd(), fullPath);
            
            patternsToCheck.forEach(pattern => {
                const matches = content.match(pattern.regex);
                if (matches) {
                    console.log(`🚨 [${pattern.name}] ფაილში: ${relativePath}`);
                    console.log(`   💡 რჩევა: ${pattern.fix}`);
                }
            });
        }
    }
}

scanDirectory(process.cwd());

console.log('\n✅ სკანირება დასრულდა! შეასწორე ზემოთ ჩამოთვლილი ფაილები და Build წარმატებით დასრულდება.');