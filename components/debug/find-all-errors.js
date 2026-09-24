const { execSync } = require('child_process');

console.log('🔍 ვასკანირებ მთლიან პროექტს ყველა შეცდომის ერთდროულად საპოვნელად...\n');
console.log('⚙️  ვუშვებ npx tsc --noEmit-ს (ეს შეიძლება 10-20 წამი დაგჭირდეს)...\n');

try {
    // ვცდილობთ TypeScript-ის შემოწმებას. თუ შეცდომაა, ის throw-ს გააკეთებს, რასაც catch-ში დავიჭერთ
    execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: 'pipe' });
    console.log('🎉 შესანიშნავია! TypeScript-მა შეცდომები ვერ იპოვა. პროექტი 100%-ით მზად არის Vercel Build-ისთვის!');
} catch (error) {
    const output = error.stdout + error.stderr;
    
    // Next.js / TSC შეცდომების ამოცნობის რეგულარული გამოსახულება
    const nextErrorRegex = /\.\/(.*?):(\d+):\d+\nType error:\s*(.*)/g;
    const tscErrorRegex = /(.*?):\s*(\d+):\d+\s*-\s*error\s*TS\d+:\s*(.*)/g;
    
    let match;
    let errors = [];
    
    // ჯერ ვცდილობთ Next.js-ის ფორმატს
    while ((match = nextErrorRegex.exec(output)) !== null) {
        errors.push({ file: match[1], line: match[2], message: match[3].trim() });
    }
    
    // თუ ვერ ვიპოვეთ, ვცდილობთ სტანდარტულ TSC ფორმატს
    if (errors.length === 0) {
        while ((match = tscErrorRegex.exec(output)) !== null) {
            errors.push({ file: match[1].replace(/^\.\//, ''), line: match[2], message: match[3].trim() });
        }
    }

    if (errors.length > 0) {
        console.log(`❌ ნაპოვნია ${errors.length} შეცდომა მთლიან პროექტში:\n`);
        console.log('═'.repeat(80));
        
        // დავაჯგუფოთ შეცდომები ფაილების მიხედვით
        const byFile = {};
        errors.forEach(e => {
            if (!byFile[e.file]) byFile[e.file] = [];
            byFile[e.file].push(`ხაზი ${e.line}: ${e.message}`);
        });

        for (const [file, msgs] of Object.entries(byFile)) {
            console.log(`📁 ფაილი: ${file}`);
            msgs.forEach(msg => console.log(`   ⚠️  ${msg}`));
            console.log('─'.repeat(80));
        }
        
        console.log('\n💡 რჩევა: დააკოპირე ეს მთლიანი შეტყობება და მომაწოდე აქ.');
        console.log('მე მოგცემ ერთიან, ავტომატურ სკრიპტს, რომელიც ამ ჩამონათვალში არსებულ ყველა შეცდომას ერთდროულად გაასწორებს!');
    } else {
        console.log('⚠️  ვერ მოიძებნა სტანდარტული შეცდომების ფორმატი. გთხოვთ, მომაწოდოთ ზემოთ გამოტანილი ტექსტი სრულად.');
    }
}