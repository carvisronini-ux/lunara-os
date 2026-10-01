// agents/content/instagram-agent.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { InstagramBot } from '@/services/instagram-bot';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_OS_URL!;
const supabaseKey = process.env.SUPABASE_OS_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'lunara-assets';
const BACKGROUNDS_FOLDER = 'backgrounds/post';
const TEMPLATES_FOLDER = 'services/templates';

// ზოდიაქოს ნიშნების მონაცემები
const ZODIAC_SIGNS = [
  { name: 'ARIES', symbol: '♈', dates: '21 მარტი - 19 აპრილი' },
  { name: 'TAURUS', symbol: '♉', dates: '20 აპრილი - 20 მაისი' },
  { name: 'GEMINI', symbol: '♊', dates: '21 მაისი - 20 ივნისი' },
  { name: 'CANCER', symbol: '♋', dates: '21 ივნისი - 22 ივლისი' },
  { name: 'LEO', symbol: '', dates: '23 ივლისი - 22 აგვისტო' },
  { name: 'VIRGO', symbol: '♍', dates: '23 აგვისტო - 22 სექტემბერი' },
  { name: 'LIBRA', symbol: '♎', dates: '23 სექტემბერი - 22 ოქტომბერი' },
  { name: 'SCORPIO', symbol: '♏', dates: '23 ოქტომბერი - 21 ნოემბერი' },
  { name: 'SAGITTARIUS', symbol: '♐', dates: '22 ნოემბერი - 21 დეკემბერი' },
  { name: 'CAPRICORN', symbol: '♑', dates: '22 დეკემბერი - 19 იანვარი' },
  { name: 'AQUARIUS', symbol: '♒', dates: '20 იანვარი - 18 თებერვალი' },
  { name: 'PISCES', symbol: '♓', dates: '19 თებერვალი - 20 მარტი' },
];

export class InstagramAgent {
  private bot: InstagramBot;

  constructor() {
    this.bot = new InstagramBot();
  }

  /**
   * ქმნის და აქვეყნებს ჰოროსკოპის პოსტს
   */
  async createAndPublish(topic: string, style: string = 'dark-luxury') {
    try {
      console.log('🎨 [InstagramAgent] ვქმნი ჰოროსკოპის პოსტს...');

      // 1. ავირჩიოთ რენდომული ფონი
      const backgroundUrl = await this.getRandomBackground();
      console.log('📸 ფონი არჩეულია:', backgroundUrl);

      // 2. ავირჩიოთ რენდომული ზოდიაქოს ნიშანი (ან topic-დან ამოვიღოთ)
      const zodiac = this.getZodiacFromTopic(topic);
      console.log('♈ ზოდიაქო:', zodiac.name);

      // 3. დავაგენერიროთ ჰოროსკოპის ტექსტი AI-ით
      const horoscopeText = await this.generateHoroscopeText(zodiac.name, topic);
      console.log('📝 ტექსტი დაგენერირებულია');

      // 4. წავიკითხოთ SVG თემფლეითი
      const templatePath = path.resolve(__dirname, '../templates/horoscope-template.svg');
      let svgTemplate = fs.readFileSync(templatePath, 'utf-8');

      // 5. შევცვალოთ ტექსტი SVG-ში
      svgTemplate = svgTemplate.replace(/id="zodiac-symbol"[^>]*>♈</, `id="zodiac-symbol" x="512" y="200" font-family="'Playfair Display', 'Georgia', serif" font-size="180" fill="#D4AF37" text-anchor="middle">${zodiac.symbol}<`);
      svgTemplate = svgTemplate.replace(/id="zodiac-name"[^>]*>ARIES</, `id="zodiac-name" x="512" y="320" font-family="'Playfair Display', 'Georgia', serif" font-size="72" fill="#FFFFFF" text-anchor="middle" font-weight="bold" letter-spacing="8">${zodiac.name}<`);
      svgTemplate = svgTemplate.replace(/id="zodiac-dates"[^>]*>21 მარტი - 19 აპრილი</, `id="zodiac-dates" x="512" y="380" font-family="'Inter', 'Arial', sans-serif" font-size="28" fill="#A0A0A0" text-anchor="middle" letter-spacing="3">${zodiac.dates}<`);
      svgTemplate = svgTemplate.replace(/<div[^>]*>[\s\S]*?<\/div>/, `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Inter', 'Arial', sans-serif; font-size: 32px; line-height: 1.7; color: #FFFFFF; text-align: center; font-weight: 300;">${horoscopeText}</div>`);

      // 6. ჩამოვტვირთოთ ფონი
      const backgroundResponse = await fetch(backgroundUrl);
      const backgroundBuffer = Buffer.from(await backgroundResponse.arrayBuffer());

      // 7. გავაერთიანოთ ფონი + SVG
      const finalImage = await this.compositeImage(backgroundBuffer, svgTemplate);

      // 8. ავტვირთოთ Supabase-ში
      const fileName = `horoscope-${zodiac.name.toLowerCase()}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
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
      const publishResult = await this.bot.publishPost(publicUrl, caption);

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
    // ვიღებთ ყველა ფაილს backgrounds/post ფოლდერიდან
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

    // ვფილტრავთ მხოლოდ .jpg ფაილებს
    const jpgFiles = data.filter(file => file.name.endsWith('.jpg'));
    
    if (jpgFiles.length === 0) {
      throw new Error('No background images found in bucket');
    }

    // ვირჩევთ რენდომულ ფაილს
    const randomFile = jpgFiles[Math.floor(Math.random() * jpgFiles.length)];
    const fullPath = `${BACKGROUNDS_FOLDER}/${randomFile.name}`;
    
    // ვიღებთ public URL-ს
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fullPath);
    
    return urlData.publicUrl;
  }

  /**
   * აერთიანებს ფონს და SVG-ს ერთ სურათად
   */
  private async compositeImage(backgroundBuffer: Buffer, svgTemplate: string): Promise<Buffer> {
    // ვქმნით SVG ბუფერს
    const svgBuffer = Buffer.from(svgTemplate);

    // ვაერთიანებთ ფონს + SVG-ს
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
   * აგენერირებს ჰოროსკოპის ტექსტს (ამჟამად mock, მომავალში AI-ით)
   */
  private async generateHoroscopeText(zodiacName: string, topic: string): Promise<string> {
    // აქ მომავალში ჩავსვამთ AI-ის (GPT-4/Claude) გამოძახებას
    // ამამად ვაბრუნებთ mock ტექსტს
    const mockTexts: Record<string, string> = {
      'ARIES': 'დღეს ენერგია შენს მხარესაა. ნუ შეგეშინდება ახალი დასაწყისის, რადგან სამყარო შენს თამამ ნაბიჯებს უჭერს მხარს.',
      'TAURUS': 'სტაბილურობა და კომფორტი დღეს შენი მთავარი თემებია. მოუსმინე შენს სხეულს და მიეცი მას დასვენება.',
      'GEMINI': 'კომუნიკაცია დღეს შენი ძლიერი მხარეა. გამოიყენე ეს დრო მნიშვნელოვანი საუბრებისთვის.',
      // ... დანარჩენი ნიშნები
    };

    return mockTexts[zodiacName] || 'დღეს კარგი დღეა ახალი შესაძლებლობებისთვის. იყავი ღია ცვლილებების მიმართ.';
  }

  /**
  : ამოიცნობს ზოდიაქოს ნიშანს topic-დან
   */
  private getZodiacFromTopic(topic: string) {
    const topicUpper = topic.toUpperCase();
    
    for (const sign of ZODIAC_SIGNS) {
      if (topicUpper.includes(sign.name)) {
        return sign;
      }
    }

    // თუ ვერ ვიპოვეთ, ვირჩევთ რენდომულს
    return ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)];
  }
}