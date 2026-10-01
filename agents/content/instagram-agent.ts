// agents/content/instagram-agent.ts
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { Resvg, initWasm } from '@resvg/resvg-wasm'; // ✅ სუფთა WASM ვერსია
import { InstagramAdapter } from '../../services/distribution/instagram-adapter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_OS_URL!;
const supabaseKey = process.env.SUPABASE_OS_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'lunara-assets';
const BACKGROUNDS_FOLDER = 'backgrounds/post';

const ZODIAC_SIGNS = [
  { name: 'ARIES', symbol: '♈', dates: '21 მარტი - 19 აპრილი', georgian: 'ვერძი' },
  { name: 'TAURUS', symbol: '♉', dates: '20 აპრილი - 20 მაისი', georgian: 'კურო' },
  { name: 'GEMINI', symbol: '♊', dates: '21 მაისი - 20 ივნისი', georgian: 'ტყუპი' },
  { name: 'CANCER', symbol: '♋', dates: '21 ივნისი - 22 ივლისი', georgian: 'კირჩხიბი' },
  { name: 'LEO', symbol: '♌', dates: '23 ივლისი - 22 აგვისტო', georgian: 'ლომი' },
  { name: 'VIRGO', symbol: '♍', dates: '23 აგვისტო - 22 სექტემბერი', georgian: 'ქალწული' },
  { name: 'LIBRA', symbol: '♎', dates: '23 სექტემბერი - 22 ოქტომბერი', georgian: 'სასწორი' },
  { name: 'SCORPIO', symbol: '♏', dates: '23 ოქტომბერი - 21 ნოემბერი', georgian: 'მორიელი' },
  { name: 'SAGITTARIUS', symbol: '♐', dates: '22 ნოემბერი - 21 დეკემბერი', georgian: 'მშვილდოსანი' },
  { name: 'CAPRICORN', symbol: '♑', dates: '22 დეკემბერი - 19 იანვარი', georgian: 'თხის რქა' },
  { name: 'AQUARIUS', symbol: '♒', dates: '20 იანვარი - 18 თებერვალი', georgian: 'მერწყული' },
  { name: 'PISCES', symbol: '♓', dates: '19 თებერვალი - 20 მარტი', georgian: 'თევზები' },
];

export class InstagramAgent {
  private instagramAdapter: InstagramAdapter;

  constructor() {
    this.instagramAdapter = new InstagramAdapter();
  }

  async generatePreview(topic: string, _style: string = 'dark-luxury') {
    try {
      console.log('\n🎨 [InstagramAgent] === დაწყება: ჰოროსკოპის პოსტის გენერაცია ===');
      console.log(`📝 თემა: "${topic}", სტილი: "${_style}"`);
      
      console.log('1️⃣ ვიღებ ფონის ბაფერს...');
      const backgroundBuffer = await this.getRandomBackgroundBuffer();
      console.log(`✅ ფონის ბაფერი მიღებულია. ზომა: ${backgroundBuffer.length} ბაიტი`);
      
      console.log('2️⃣ ვადგენ ზოდიაქოს ნიშანს...');
      const zodiac = this.getZodiacFromTopic(topic);
      console.log(`✅ არჩეული ზოდიაქო: ${zodiac.georgian} (${zodiac.name})`);
      
      console.log('3️⃣ ვაგენერირებ ჰოროსკოპის ტექსტს...');
      const horoscopeText = await this.generateHoroscopeText(zodiac.name, topic);
      console.log(`✅ ტექსტი გენერირებულია. სიგრძე: ${horoscopeText.length} სიმბოლო`);
      
      console.log('4️⃣ ვკითხულობ SVG შაბლონს...');
      const templatePath = path.join(process.cwd(), 'services', 'templates', 'horoscope-template.svg');
      console.log(`📂 შაბლონის გზა: ${templatePath}`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`SVG შაბლონი ვერ მოიძებნა მისამართზე: ${templatePath}`);
      }
      
      let svgTemplate = fs.readFileSync(templatePath, 'utf-8');
      console.log(`✅ შაბლონი წაკითხულია. ზომა: ${svgTemplate.length} ბაიტი`);
      
      console.log('5️⃣ ვანაცვლებ პლეისჰოლდერებს შაბლონში...');
      svgTemplate = svgTemplate
        .replace('{{ZODIAC_SYMBOL}}', zodiac.symbol)
        .replace('{{ZODIAC_NAME}}', zodiac.name)
        .replace('{{ZODIAC_DATE}}', zodiac.dates)
        .replace('{{HOROSCOPE_TEXT}}', horoscopeText);
      console.log('✅ პლეისჰოლდერები წარმატებით ჩანაცვლდა');

      console.log('6️⃣ ვაერთიანებ ფონს და SVG-ს...');
      const finalImage = await this.compositeImage(backgroundBuffer, svgTemplate);
      console.log(`✅ კომპოზიცია წარმატებით შეიქმნა. საბოლოო ზომა: ${finalImage.length} ბაიტი`);

      console.log('7️⃣ ვტვირთავ საბოლოო სურათს Supabase-ში...');
      const fileName = `preview-${zodiac.name.toLowerCase()}-${Date.now()}.jpg`;
      const uploadPath = `previews/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uploadPath, finalImage, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Supabase ატვირთვის შეცდომა:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      console.log(`✅ სურათი ატვირთულია: ${uploadPath}`);

      const publicUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadPath).data.publicUrl;
      const caption = `${zodiac.symbol} ${zodiac.georgian} - დღის ჰოროსკოპი\n\n${horoscopeText}\n\n#LUNARA #Horoscope #${zodiac.georgian} #Astrology #DailyHoroscope`;

      console.log('🎉 === გენერაცია წარმატებით დასრულდა ===\n');
      return {
        success: true,
        imageUrl: publicUrl,
        caption: caption,
        zodiac: zodiac.georgian
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('\n❌ [InstagramAgent] Preview error:', errorMsg);
      if (error instanceof Error && error.stack) {
        console.error('📚 Stack trace:', error.stack);
      }
      console.log('===================================================\n');
      return { success: false, error: errorMsg };
    }
  }

  async publishExisting(imageUrl: string, caption: string) {
    try {
      console.log('🚀 [InstagramAgent] ვაქვეყნებ არსებულ სურათს...');
      const publishResult = await this.instagramAdapter.publishPost(imageUrl, caption);
      
      if (publishResult.success) {
        return { 
          success: true, 
          postId: publishResult.postId, 
          instagramUrl: `https://www.instagram.com/p/${publishResult.postId}` 
        };
      } else {
        throw new Error(`Publish failed: ${publishResult.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [InstagramAgent] Publish error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  private async getRandomBackgroundBuffer(): Promise<Buffer> {
    console.log(`   🔍 ვეძებ ფაილებს ბაქეტში: ${BUCKET_NAME} / ${BACKGROUNDS_FOLDER}`);
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(BACKGROUNDS_FOLDER, { limit: 100 });

    if (error) {
      console.error('   ❌ ბაქეტის სიის მიღების შეცდომა:', error);
      throw new Error(`Failed to list backgrounds: ${error.message}`);
    }

    console.log(`   📂 ნაპოვნია ${data.length} ფაილი ბაქეტში.`);
    const imageFiles = data.filter(file => file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.jpeg'));
    
    if (imageFiles.length === 0) {
      console.error('   ❌ სურათის ფაილები ვერ მოიძებნა! ნაპოვნი ფაილები:', data.map(f => f.name));
      throw new Error('No background images found in bucket.');
    }

    const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    const filePath = `${BACKGROUNDS_FOLDER}/${randomFile.name}`;
    console.log(`   🎲 არჩეულია შემთხვევითი ფაილი: ${randomFile.name} (ზომა ბაქეტში: ${randomFile.metadata?.size || 'უცნობი'} ბაიტი)`);
    
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;
    console.log(`   🔗 გენერირებული საჯარო URL: ${publicUrl}`);
    
    console.log('   ⬇️ ვიწყებ fetch-ს...');
    const response = await fetch(publicUrl);
    console.log(`   📡 Fetch პასუხი: სტატუსი ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('   ❌ Fetch შეცდომა. პასუხის ტექსტი:', errorText.substring(0, 300));
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log(`   🏷️ მიღებული Content-Type: "${contentType}"`);

    if (!contentType || !contentType.startsWith('image/')) {
      const textPreview = await response.text();
      console.error('   ⚠️ შეცდომა: ფაილი არ არის სურათი! Content-Type არ არის image/...');
      console.error('   📄 პასუხის დასაწყისი (პირველი 300 სიმბოლო):', textPreview.substring(0, 300));
      throw new Error(`Downloaded file is not a valid image. Content-Type: ${contentType}. Preview: ${textPreview.substring(0, 100)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`   ✅ წარმატებით ჩამოიტვირთა ${buffer.length} ბაიტი.`);
    return buffer;
  }

  // ✅ საბოლოო, უნივერსალური მეთოდი: ჯერ SVG -> PNG (WASM-ით), შემდეგ Sharp
  private async compositeImage(backgroundBuffer: Buffer, svgTemplate: string): Promise<Buffer> {
    console.log('   ⚙️ ვამზადებ კომპოზიციას (WASM SVG -> PNG -> Sharp)...');
    
    // 1. Resvg WASM-ის ინიციალიზაცია (მხოლოდ ერთხელ პროცესის განმავლობაში)
    if (!(global as any).__resvgWasmInitialized) {
      const wasmPath = path.join(process.cwd(), 'node_modules', '@resvg/resvg-wasm', 'index_bg.wasm');
      const wasmBuffer = fs.readFileSync(wasmPath);
      await initWasm(wasmBuffer);
      (global as any).__resvgWasmInitialized = true;
      console.log('   ✅ Resvg WASM ინიციალიზებულია');
    }

    // 2. SVG ტექსტის გარდაქმნა PNG ბაფერად
    const resvg = new Resvg(svgTemplate, {
      fitTo: { mode: 'width', value: 1024 }, // ჩვენი SVG არის 1024x1024
    });
    const pngData = resvg.render();
    
    // ✅ გამოსწორება: Uint8Array-ის გადაყვანა Node.js Buffer-ში, რათა sharp-მა მიიღოს
    const svgPngBuffer = Buffer.from(pngData.asPng());
    console.log(`   ✅ SVG გადაიქცა PNG-დ. ზომა: ${svgPngBuffer.length} ბაიტი`);

    // 3. Sharp-ით გაერთიანება
    try {
      const result = await sharp(backgroundBuffer)
        .composite([{ input: svgPngBuffer, top: 0, left: 0 }])
        .jpeg({ quality: 95 })
        .toBuffer();
      console.log('   ✅ Sharp კომპოზიცია წარმატებულია.');
      return result;
    } catch (sharpError: any) {
      console.error('   ❌ Sharp შეცდომა დეტალურად:', sharpError.message);
      throw sharpError;
    }
  }

  private async generateHoroscopeText(zodiacName: string, _topic: string): Promise<string> {
    const mockTexts: Record<string, string> = {
      'ARIES': 'დღეს ენერგია შენს მხარესაა. ნუ შეგეშინდება ახალი დასაწყისის, რადგან სამყარო შენს თამამ ნაბიჯებს უჭერს მხარს. მოუსმინე შენს შინაგან ხმას.',
      'TAURUS': 'სტაბილურობა და კომფორტი დღეს შენი მთავარი თემებია. მოუსმინე შენს სხეულს და მიეცი მას დასვენება, რომ ხვალ უფრო ძლიერი იყო.',
      'GEMINI': 'კომუნიკაცია დღეს შენი ძლიერი მხარეა. გამოიყენე ეს დრო მნიშვნელოვანი საუბრებისთვის და იდეების გაზიარებისთვის.',
      'CANCER': 'შენი ინტუიცია დღეს განსაკუთრებით მწვავეა. ენდე შენს გრძნობებს და ნუ იჩქარებ გადაწყვეტილებების მიღებას.',
      'LEO': 'შენი ბუნებრივი ქარიზმა დღეს ყველას ყურადღებას მიიპყრობს. იყავი დარწმუნებული და გაანათე ოთახი შენი ენერგიით.',
      'VIRGO': 'დეტალებზე ორიენტირება დღეს შენს უდიდეს ძალას წარმოადგენს. მოაწესრიგე სივრცე და აზრები, რათა ჰარმონია შეინარჩუნო.',
      'LIBRA': 'ჰარმონია და ბალანსი დღეს შენი მთავარი მიზანია. ეძებე კომპრომისი და აირიდე კონფლიქტები.',
      'SCORPIO': 'ღრმა ტრანსფორმაცია გელით. გაათავისუფლე ის, რაც გჭირდება და მიეცი ადგილი ახალ შესაძლებლობებს.',
      'SAGITTARIUS': 'თავგადასავალი გეძახის. გაფართოვება და ახალი ჰორიზონტების აღმოჩენა დღეს შენს სულს სჭირდება.',
      'CAPRICORN': 'შენი შრომისმოყვარეობა დღეს ნაყოფს გამოიღებს. დარჩი ფოკუსირებული შენს გრძელვადიან მიზნებზე.',
      'AQUARIUS': 'შენი უნიკალური ხედვა დღეს სხვებს შთააგონებს. ნუ შეგეშინდება იყო ის, ვინც ხარ.',
      'PISCES': 'შენი შემოქმედებითი ენერგია დღეს პიკზეა. მიეცი მას გამოხატვის საშუალება ხელოვნებაში ან სიზმრებში.'
    };

    return mockTexts[zodiacName] || 'დღეს კარგი დღეა ახალი შესაძლებლობებისთვის. იყავი ღია ცვლილებების მიმართ და ენდე სამყაროს ნაკადს.';
  }

  private getZodiacFromTopic(topic: string) {
    const topicUpper = topic.toUpperCase();
    for (const sign of ZODIAC_SIGNS) {
      if (topicUpper.includes(sign.name) || topicUpper.includes(sign.georgian)) {
        return sign;
      }
    }
    return ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)];
  }
}