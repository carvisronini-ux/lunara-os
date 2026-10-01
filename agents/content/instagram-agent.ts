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
      console.log('🎨 [InstagramAgent] ვქმნი ჰოროსკოპის პოსტის გადახედვას...');
      
      const backgroundBuffer = await this.getRandomBackgroundBuffer();
      const zodiac = this.getZodiacFromTopic(topic);
      const horoscopeText = await this.generateHoroscopeText(zodiac.name, topic);
      
      const templatePath = path.join(process.cwd(), 'services', 'templates', 'horoscope-template.svg');
      let svgTemplate = fs.readFileSync(templatePath, 'utf-8');
      
      svgTemplate = svgTemplate
        .replace('{{ZODIAC_SYMBOL}}', zodiac.symbol)
        .replace('{{ZODIAC_NAME}}', zodiac.name)
        .replace('{{ZODIAC_DATE}}', zodiac.dates)
        .replace('{{HOROSCOPE_TEXT}}', horoscopeText);

      const finalImage = await this.compositeImage(backgroundBuffer, svgTemplate);

      const fileName = `preview-${zodiac.name.toLowerCase()}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(`previews/${fileName}`, finalImage, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const publicUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(`previews/${fileName}`).data.publicUrl;
      const caption = `${zodiac.symbol} ${zodiac.georgian} - დღის ჰოროსკოპი\n\n${horoscopeText}\n\n#LUNARA #Horoscope #${zodiac.georgian} #Astrology #DailyHoroscope`;

      return {
        success: true,
        imageUrl: publicUrl,
        caption: caption,
        zodiac: zodiac.georgian
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [InstagramAgent] Preview error:', errorMsg);
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
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(BACKGROUNDS_FOLDER, { limit: 100 });

    if (error) throw new Error(`Failed to list backgrounds: ${error.message}`);

    const imageFiles = data.filter(file => file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.jpeg'));
    if (imageFiles.length === 0) {
      throw new Error('No background images found in bucket.');
    }

    const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    const filePath = `${BACKGROUNDS_FOLDER}/${randomFile.name}`;
    
    // ვიყენებთ საჯარო URL-ს, რადგან ბაქეტი public-ია
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;
    
    console.log(`📥 ვცდილობ ჩამოვტვირთო საჯარო URL-ით: ${publicUrl}`);
    
    const response = await fetch(publicUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`✅ წარმატებით ჩამოიტვირთა ${buffer.length} ბაიტი.`);
    return buffer;
  }

  private async compositeImage(backgroundBuffer: Buffer, svgTemplate: string): Promise<Buffer> {
    const svgBuffer = Buffer.from(svgTemplate);
    return await sharp(backgroundBuffer)
      .composite([{ input: svgBuffer, top: 0, left: 0 }])
      .jpeg({ quality: 95 })
      .toBuffer();
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