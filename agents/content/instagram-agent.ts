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
const BACKGROUNDS_FOLDER = 'backgrounds/post';

// ზოდიაქოს ნიშნების მონაცემები
const ZODIAC_SIGNS = [
  { name: 'ARIES', symbol: '♈', dates: '21 მარტი - 19 აპრილი' },
  { name: 'TAURUS', symbol: '♉', dates: '20 აპრილი - 20 მაისი' },
  { name: 'GEMINI', symbol: '♊', dates: '21 მაისი - 20 ივნისი' },
  { name: 'CANCER', symbol: '♋', dates: '21 ივნისი - 22 ივლისი' },
  { name: 'LEO', symbol: '♌', dates: '23 ივლისი - 22 აგვისტო' },
  { name: 'VIRGO', symbol: '♍', dates: '23 აგვისტო - 22 სექტემბერი' },
  { name: 'LIBRA', symbol: '♎', dates: '23 სექტემბერი - 22 ოქტომბერი' },
  { name: 'SCORPIO', symbol: '♏', dates: '23 ოქტომბერი - 21 ნოემბერი' },
  { name: 'SAGITTARIUS', symbol: '♐', dates: '22 ნოემბერი - 21 დეკემბერი' },
  { name: 'CAPRICORN', symbol: '♑', dates: '22 დეკემბერი - 19 იანვარი' },
  { name: 'AQUARIUS', symbol: '♒', dates: '20 იანვარი - 18 თებერვალი' },
  { name: 'PISCES', symbol: '♓', dates: '19 თებერვალი - 20 მარტი' },
];

export class InstagramAgent {
  private instagramAdapter: InstagramAdapter;

  constructor() {
    this.instagramAdapter = new InstagramAdapter();
  }

  /**
   * ქმნის და აქვეყნებს ჰოროსკოპის პოსტს
   */
  async createAndPublish(topic: string, _style: string = 'dark-luxury') {
    try {
      console.log(`🎨 [InstagramAgent] ვქმნი ჰოროსკოპის პოსტს... (სტილი: ${_style})`);

      // 1. ავირჩიოთ რენდომული ფონი
      const backgroundUrl = await this.getRandomBackground();
      console.log('📸 ფონი არჩეულია:', backgroundUrl);

      // 2. ავირჩიოთ ზოდიაქოს ნიშანი
      const zodiac = this.getZodiacFromTopic(topic);
      console.log('♈ ზოდიაქო:', zodiac.name);

      // 3. დავაგენერიროთ ჰოროსკოპის ტექსტი
      const horoscopeText = await this.generateHoroscopeText(zodiac.name, topic);
      console.log('📝 ტექსტი დაგენერირებულია');

      // 4. წავიკითხოთ SVG თემფლეითი
      const templatePath = path.join(process.cwd(), 'services', 'templates', 'horoscope-template.svg');
      let svgTemplate = fs.readFileSync(templatePath, 'utf-8');

      // 5. შევცვალოთ ტექსტი SVG-ში
      svgTemplate = svgTemplate.replace(
        /<text id="zodiac-symbol"[^>]*>.*?<\/text>/, 
        `<text id="zodiac-symbol" x="512" y="200" font-family="'Playfair Display', 'Georgia', serif" font-size="180" fill="#D4AF37" text-anchor="middle">${zodiac.symbol}</text>`
      );
      svgTemplate = svgTemplate.replace(
        /<text id="zodiac-name"[^>]*>.*?<\/text>/, 
        `<text id="zodiac-name" x="512" y="320" font-family="'Playfair Display', 'Georgia', serif" font-size="72" fill="#FFFFFF" text-anchor="middle" font-weight="bold" letter-spacing="8">${zodiac.name}</text>`
      );
      svgTemplate = svgTemplate.replace(
        /<text id="zodiac-dates"[^>]*>.*?<\/text>/, 
        `<text id="zodiac-dates" x="512" y="380" font-family="'Inter', 'Arial', sans-serif" font-size="28" fill="#A0A0A0" text-anchor="middle" letter-spacing="3">${zodiac.dates}</text>`
      );
      
      // ტექსტის ჩასმა foreignObject-ში
      const textRegex = /<div xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"[^>]*>[\s\S]*?<\/div>/;
      const newTextDiv = `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Inter', 'Arial', sans-serif; font-size: 32px; line-height: 1.7; color: #FFFFFF; text-align: center; font-weight: 300; padding: 0 20px;">${horoscopeText}</div>`;
      svgTemplate = svgTemplate.replace(textRegex, newTextDiv);

      // 6. ჩამოვტვირთოთ ფონი
      const backgroundResponse = await fetch(backgroundUrl);
      const backgroundBuffer = Buffer.from(await backgroundResponse.arrayBuffer());

      // 7. გავაერთიანოთ ფონი + SVG
      const finalImage = await this.compositeImage(backgroundBuffer, svgTemplate);

      // 8. ავტვირთოთ Supabase-ში
      const fileName = `horoscope-${zodiac.name.toLowerCase()}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(`posts/${fileName}`, finalImage, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const publicUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(`posts/${fileName}`).data.publicUrl;
      console.log('✅ სურათი ატვირთულია:', publicUrl);

      // 9. გამოვაქვეყნოთ Instagram-ზე
      const caption = `${zodiac.symbol} ${zodiac.name} - დღის ჰოროსკოპი\n\n${horoscopeText}\n\n#LUNARA #Horoscope #${zodiac.name} #Astrology #DailyHoroscope`;
      const publishResult = await this.instagramAdapter.publishPost(publicUrl, caption);

      if (publishResult.success) {
        console.log('🎉 პოსტი წარმატებით გამოქვეყნდა!');
        return {
          success: true,
          postId: publishResult.postId,
          imageUrl: publicUrl,
          caption: caption,
          zodiac: zodiac.name
        };
      } else {
        throw new Error(`Publish failed: ${publishResult.error}`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [InstagramAgent] შეცდომა:', errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * იღებს რენდომულ ფონს Supabase-დან
   */
  private async getRandomBackground(): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(BACKGROUNDS_FOLDER, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      throw new Error(`Failed to list backgrounds: ${error.message}`);
    }

    const jpgFiles = data.filter(file => file.name.endsWith('.jpg'));
    if (jpgFiles.length === 0) {
      throw new Error('No background images found in bucket');
    }

    const randomFile = jpgFiles[Math.floor(Math.random() * jpgFiles.length)];
    const fullPath = `${BACKGROUNDS_FOLDER}/${randomFile.name}`;
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fullPath);
    
    return urlData.publicUrl;
  }

  /**
   * აერთიანებს ფონს და SVG-ს ერთ სურათად
   */
  private async compositeImage(backgroundBuffer: Buffer, svgTemplate: string): Promise<Buffer> {
    const svgBuffer = Buffer.from(svgTemplate);

    const composite = await sharp(backgroundBuffer)
      .composite([{
        input: svgBuffer,
        top: 0,
        left: 0
      }])
      .jpeg({ quality: 95 })
      .toBuffer();

    return composite;
  }

  /**
   * აგენერირებს ჰოროსკოპის ტექსტს (Mock ვერსია)
   */
  // 👇 აქ არის გამოსწორებული: _topic (რათა TS-მა არ ჩათვალოს გამოუყენებლად)
  private async generateHoroscopeText(zodiacName: string, _topic: string): Promise<string> {
    const mockTexts: Record<string, string> = {
      'ARIES': 'დღეს ენერგია შენს მხარესაა. ნუ შეგეშინდება ახალი დასაწყისის, რადგან სამყარო შენს თამამ ნაბიჯებს უჭერს მხარს.',
      'TAURUS': 'სტაბილურობა და კომფორტი დღეს შენი მთავარი თემებია. მოუსმინე შენს სხეულს და მიეცი მას დასვენება.',
      'GEMINI': 'კომუნიკაცია დღეს შენი ძლიერი მხარეა. გამოიყენე ეს დრო მნიშვნელოვანი საუბრებისთვის.',
      'CANCER': 'შენი ინტუიცია დღეს განსაკუთრებით მწვავეა. ენდე შენს გრძნობებს და ნუ იჩქარებ გადაწყვეტილებების მიღებას.',
      'LEO': 'შენი ბუნებრივი ქარიზმა დღეს ყველას ყურადღებას მიიპყრობს. იყავი დარწმუნებული და გაანათე ოთახი.',
      'VIRGO': 'დეტალებზე ორიენტირება დღეს შენს უდიდეს ძალას წარმოადგენს. მოაწესრიგე სივრცე და აზრები.',
      'LIBRA': 'ჰარმონია და ბალანსი დღეს შენი მთავარი მიზანია. ეძებე კომპრომისი და აირიდე კონფლიქტები.',
      'SCORPIO': 'ღრმა ტრანსფორმაცია გელით. გაათავისუფლე ის, რაც გჭირდება და მიეცი ადგილი ახალს.',
      'SAGITTARIUS': 'თავგადასავალი გეძახის. გაფართოვება და ახალი ჰორიზონტების აღმოჩენა დღეს შენს სულს სჭირდება.',
      'CAPRICORN': 'შენი შრომისმოყვარეობა დღეს ნაყოფს გამოიღებს. დარჩი ფოკუსირებული შენს გრძელვადიან მიზნებზე.',
      'AQUARIUS': 'შენი უნიკალური ხედვა დღეს სხვებს შთააგონებს. ნუ შეგეშინდება იყო ის, ვინც ხარ.',
      'PISCES': 'შენი შემოქმედებითი ენერგია დღეს პიკზეა. მიეცი მას გამოხატვის საშუალება ხელოვნებაში ან სიზმრებში.'
    };

    return mockTexts[zodiacName] || 'დღეს კარგი დღეა ახალი შესაძლებლობებისთვის. იყავი ღია ცვლილებების მიმართ და ენდე სამყაროს ნაკადს.';
  }

  /**
   * ამოიცნობს ზოდიაქოს ნიშანს topic-დან
   */
  private getZodiacFromTopic(topic: string) {
    const topicUpper = topic.toUpperCase();
    
    for (const sign of ZODIAC_SIGNS) {
      if (topicUpper.includes(sign.name) || topicUpper.includes(this.getZodiacGeorgian(sign.name))) {
        return sign;
      }
    }

    // თუ ვერ ვიპოვეთ, ვირჩევთ რენდომულს
    return ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)];
  }

  private getZodiacGeorgian(name: string): string {
    const map: Record<string, string> = {
      'ARIES': 'ვერძი', 'TAURUS': 'კურო', 'GEMINI': 'ტყუპი', 'CANCER': 'კირჩხიბი',
      'LEO': 'ლომი', 'VIRGO': 'ქალწული', 'LIBRA': 'სასწორი', 'SCORPIO': 'მორიელი',
      'SAGITTARIUS': 'მშვილდოსანი', 'CAPRICORN': 'თხის რქა', 'AQUARIUS': 'მერწყული', 'PISCES': 'თევზები'
    };
    return map[name] || '';
  }
}