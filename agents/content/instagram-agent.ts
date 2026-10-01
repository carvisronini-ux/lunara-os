// agents/content/instagram-agent.ts
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { InstagramAdapter } from '../../services/distribution/instagram-adapter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_OS_URL!;
const supabaseKey = process.env.SUPABASE_OS_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'lunara-assets';
const ZODIAC_SIGNS_FOLDER = 'zodiac-signs';

const ZODIAC_SIGNS = [
  { name: 'ARIES', symbol: '♈', dates: '21 მარტი - 19 აპრილი', georgian: 'ვერძი' },
  { name: 'TAURUS', symbol: '♉', dates: '20 აპრილი - 20 მაისი', georgian: 'კურო' },
  { name: 'GEMINI', symbol: '♊', dates: '21 მაისი - 20 ივნისი', georgian: 'ტყუპი' },
  { name: 'CANCER', symbol: '', dates: '21 ივნისი - 22 ივლისი', georgian: 'კირჩხიბი' },
  { name: 'LEO', symbol: '♌', dates: '23 ივლისი - 22 აგვისტო', georgian: 'ლომი' },
  { name: 'VIRGO', symbol: '', dates: '23 აგვისტო - 22 სექტემბერი', georgian: 'ქალწული' },
  { name: 'LIBRA', symbol: '♎', dates: '23 სექტემბერი - 22 ოქტომბერი', georgian: 'სასწორი' },
  { name: 'SCORPIO', symbol: '♏', dates: '23 ოქტომბერი - 21 ნოემბერი', georgian: 'მორიელი' },
  { name: 'SAGITTARIUS', symbol: '♐', dates: '22 ნოემბერი - 21 დეკემბერი', georgian: 'მშვილდოსანი' },
  { name: 'CAPRICORN', symbol: '', dates: '22 დეკემბერი - 19 იანვარი', georgian: 'თხის რქა' },
  { name: 'AQUARIUS', symbol: '♒', dates: '20 იანვარი - 18 თებერვალი', georgian: 'მერწყული' },
  { name: 'PISCES', symbol: '', dates: '19 თებერვალი - 20 მარტი', georgian: 'თევზები' },
];

export class InstagramAgent {
  private instagramAdapter: InstagramAdapter;

  constructor() {
    this.instagramAdapter = new InstagramAdapter();
  }

  async generatePreview(topic: string, _style: string = 'default') {
    try {
      console.log('\n🎨 [InstagramAgent] === დაწყება: ჰოროსკოპის პოსტის გენერაცია ===');
      console.log(`📝 თემა: "${topic}"`);
      
      // 1. ვირჩევთ ზოდიაქოს ნიშანს
      console.log('1️⃣ ვირჩევთ ზოდიაქოს ნიშანს...');
      const zodiac = this.getZodiacFromTopic(topic);
      console.log(`✅ არჩეული ზოდიაქო: ${zodiac.georgian} (${zodiac.name})`);

      // 2. ვტვირთავთ მზა ფოტოს Supabase-იდან
      console.log('2️⃣ ვტვირთავთ მზა ფოტოს...');
      const zodiacImageBuffer = await this.getZodiacImage(zodiac.name);
      console.log(`✅ ფოტო ჩამოიტვირთა. ზომა: ${zodiacImageBuffer.length} ბაიტი`);

      // 3. ვაგენერირებთ ჰოროსკოპის ტექსტს
      console.log('3️⃣ ვაგენერირებთ ჰოროსკოპის ტექსტს...');
      const horoscopeText = await this.generateHoroscopeText(zodiac.name, topic);
      console.log(`✅ ტექსტი გენერირებულია. სიგრძე: ${horoscopeText.length} სიმბოლო`);

      // 4. ვამატებთ ტექსტს ფოტოს
      console.log('4️⃣ ვამატებთ ტექსტს ფოტოს...');
      const finalImage = await this.addTextToImage(zodiacImageBuffer, zodiac.name, horoscopeText);
      console.log(`✅ ტექსტი დაემატა. საბოლოო ზომა: ${finalImage.length} ბაიტი`);

      // 5. ვტვირთავთ საბოლოო სურათს Supabase-ში
      console.log('5️⃣ ვტვირთავთ საბოლოო სურათს...');
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

  // ახალი მეთოდი: ვტვირთავთ მზა ოდიაქოს ფოტოს
  private async getZodiacImage(zodiacName: string): Promise<Buffer> {
    const fileName = `${zodiacName.toLowerCase()}.png`;
    const filePath = `${ZODIAC_SIGNS_FOLDER}/${fileName}`;
    
    console.log(`   📥 ვტვირთავთ: ${filePath}`);
    
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;
    
    const response = await fetch(publicUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch zodiac image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log(`   🏷️ Content-Type: "${contentType}"`);

    if (!contentType || !contentType.startsWith('image/')) {
      const textPreview = await response.text();
      console.error('   ⚠️ შეცდომა: ფაილი არ არის სურათი!');
      console.error('   📄 პასუხის დასაწყისი:', textPreview.substring(0, 200));
      throw new Error(`Downloaded file is not a valid image. Content-Type: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`   ✅ წარმატებით ჩამოიტვირთა ${buffer.length} ბაიტი.`);
    return buffer;
  }

  // ახალი მეთოდი: ვამატებთ ტექსტს მზა ფოტოს
  private async addTextToImage(baseImageBuffer: Buffer, zodiacName: string, horoscopeText: string): Promise<Buffer> {
    console.log('   ⚙️ ვამატებთ ტექსტს Sharp-ით...');
    
    // მივიღოთ სურათის ზომები
    const metadata = await sharp(baseImageBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1350;
    
    console.log(`    სურათის ზომა: ${width}x${height}`);

    // 1. შევქმნათ "What's happening today with" ტექსტი (25-40% ზონა)
    const introText = `What's happening today with`;
    const introSvg = this.createSvgText(introText, {
      x: width / 2,
      y: height * 0.35, // 35% (25-40% ზონის შუაში)
      fontSize: 28,
      fontFamily: 'Georgia, serif',
      fill: '#2D2D2D',
      textAnchor: 'middle',
      fontWeight: '400',
      letterSpacing: '2px'
    });

    // 2. შევქმნათ ჰოროსკოპის ტექსტი (50-85% ზონა)
    // ტექსტს დავშლით რამდენიმე ხაზად
    const textLines = this.wrapText(horoscopeText, 50); // მაქს 50 სიმბოლო ხაზზე
    const textYStart = height * 0.55; // 55%-დან დაწყება
    const lineHeight = 40;
    
    let horoscopeSvg = '';
    textLines.forEach((line, index) => {
      const y = textYStart + (index * lineHeight);
      horoscopeSvg += this.createSvgText(line, {
        x: width / 2,
        y: y,
        fontSize: 24,
        fontFamily: 'Georgia, serif',
        fill: '#2D2D2D',
        textAnchor: 'middle',
        fontWeight: '400',
        lineHeight: lineHeight
      });
    });

    // გავაერთიანოთ ყველა SVG
    const combinedSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${introSvg}
        ${horoscopeSvg}
      </svg>
    `;

    const svgBuffer = Buffer.from(combinedSvg);

    // შევქმნათ კომპოზიცია
    try {
      const result = await sharp(baseImageBuffer)
        .composite([{ input: svgBuffer, top: 0, left: 0 }])
        .jpeg({ quality: 95 })
        .toBuffer();
      
      console.log('   ✅ Sharp კომპოზიცია წარმატებულია.');
      return result;
    } catch (sharpError: any) {
      console.error('   ❌ Sharp შეცდომა დეტალურად:', sharpError.message);
      throw sharpError;
    }
  }

  // დამხმარე ფუნქცია: SVG ტექსტის შექმნა
  private createSvgText(text: string, options: {
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    fill: string;
    textAnchor: string;
    fontWeight?: string;
    letterSpacing?: string;
    lineHeight?: number;
  }): string {
    const { x, y, fontSize, fontFamily, fill, textAnchor, fontWeight, letterSpacing } = options;
    
    let style = `font-family: "${fontFamily}"; font-size: ${fontSize}px; fill: ${fill}; text-anchor: ${textAnchor};`;
    if (fontWeight) style += ` font-weight: ${fontWeight};`;
    if (letterSpacing) style += ` letter-spacing: ${letterSpacing};`;

    return `
      <text x="${x}" y="${y}" style="${style}">
        ${this.escapeXml(text)}
      </text>
    `;
  }

  // დამხმარე ფუნქცია: ტექსტის გადატანა ახალ ხაზზე
  private wrapText(text: string, maxCharsPerLine: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // დამხმარე ფუნქცია: XML სიმბოლოების ექსკეიპი
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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