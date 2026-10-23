// /home/carvisronini-ux/lunara-os/lib/config/instagram-template.ts

/**
 * Instagram Post Template Configuration
 * 
 * ეს არის ერთიანი კონფიგურაცია ყველა ვიზუალური პარამეტრისთვის.
 * ნებისმიერი ცვლილება აქ ავტომატურად აისახება:
 * - კონსტრუქტორში (InstagramPanel)
 * - ავტომატურ სქედულერში (instagram-scheduler)
 * - ნებისმიერ სხვა ადგილას, სადაც ეს კონფიგურაცია გამოიყენება
 */

export type PostFormat = 'post' | 'story' | 'carousel';

export interface TextElementConfig {
  /** პოზიცია Y ღერძზე (პროცენტულად 0-100) */
  topPercent: number;
  /** პოზიცია X ღერძზე (პროცენტულად 0-100, 50 = ცენტრი) */
  leftPercent: number;
  /** მაქსიმალური სიგანე (პროცენტულად) */
  maxWidthPercent: number;
  /** ფონტის ზომა პიქსელებში (1080px სიგანეზე) */
  fontSize: number;
  /** ფერის hex კოდი */
  color: string;
  /** italic თუ normal */
  italic: boolean;
  /** ხაზებს შორის დაშორება */
  lineHeight: number;
  /** მაქსიმალური ხაზების რაოდენობა (0 = შეუზღუდავი) */
  maxLines: number;
  /** ტექსტის გასწორება */
  align: 'left' | 'center' | 'right';
}

export interface LogoConfig {
  enabled: boolean;
  /** პოზიცია Y ღერძზე (პროცენტულად) */
  topPercent: number;
  /** პოზიცია X ღერძზე (პროცენტულად) */
  rightPercent: number;
  /** ზომა (პროცენტულად სიგანის მიმართ) */
  sizePercent: number;
  /** ბორდერის სისქე პიქსელებში */
  borderWidth: number;
  /** ბორდერის ფერი */
  borderColor: string;
}

export interface DateConfig {
  enabled: boolean;
  /** პოზიცია Y ღერძზე (პროცენტულად) */
  bottomPercent: number;
  /** ფონტის ზომა პიქსელებში */
  fontSize: number;
  /** ფერი */
  color: string;
  /** italic */
  italic: boolean;
}

export interface TemplateConfig {
  /** სურათის ზომები ფორმატის მიხედვით */
  dimensions: Record<PostFormat, { width: number; height: number }>;
  /** ფონის ფერი */
  backgroundColor: string;
  /** Text 1 (Hook) კონფიგურაცია */
  text1: TextElementConfig;
  /** Text 2 (Forecast) კონფიგურაცია */
  text2: TextElementConfig;
  /** თარიღის კონფიგურაცია */
  date: DateConfig;
  /** ლოგოს კონფიგურაცია */
  logo: LogoConfig;
  /** ტელეგრამის ლინკი (თუ ჩაშენებულია შაბლონში) */
  telegramLink?: string;
}

/**
 * ნაგულისხმევი კონფიგურაცია Instagram Post-ისთვის (1080x1350)
 * 
 * ეს კოორდინატები ემთხვევა InstagramPanel.tsx-ში არსებულ ლოგიკას:
 * - Text 1: top 40% (ილუსტრაციასა და სახელს შორის)
 * - Text 2: top 66% (სახელსა და ტელეგრამს შორის)
 * - Date: bottom 6% (ქვემოთ ცენტრში)
 */
export const DEFAULT_INSTAGRAM_POST_CONFIG: TemplateConfig = {
  dimensions: {
    post: { width: 1080, height: 1350 },
    story: { width: 1080, height: 1920 },
    carousel: { width: 1080, height: 1080 },
  },
  backgroundColor: '#ffffff', // გამჭვირვალე ფონი (შაბლონი ფარავს)
  
  text1: {
    topPercent: 40,
    leftPercent: 50,
    maxWidthPercent: 85,
    fontSize: 72, // 24px UI × 3 (canvas scale)
    color: '#000000',
    italic: true,
    lineHeight: 1.3,
    maxLines: 2,
    align: 'center',
  },
  
  text2: {
    topPercent: 66,
    leftPercent: 50,
    maxWidthPercent: 85,
    fontSize: 60, // 20px UI × 3
    color: '#000000',
    italic: false,
    lineHeight: 1.4,
    maxLines: 5,
    align: 'center',
  },
  
  date: {
    enabled: true,
    bottomPercent: 6,
    fontSize: 36,
    color: '#000000',
    italic: true,
  },
  
  logo: {
    enabled: true,
    topPercent: 2,
    rightPercent: 2,
    sizePercent: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  
  telegramLink: 't.me/LunaraOS',
};

/**
 * Helper ფუნქცია კონფიგურაციის მისაღებად
 * მომავალში შეიძლება დამატება: მომხმარებლის მიხედვით კონფიგურაციის ჩატვირთვა ბაზიდან
 */
// ✅ გასწორებული: დამატებულია '_' პარამეტრის წინ, რათა TypeScript-მა არ გამოიტანოს შეცდომა
export function getTemplateConfig(_format: PostFormat = 'post'): TemplateConfig {
  return DEFAULT_INSTAGRAM_POST_CONFIG;
}

/**
 * Helper ფუნქცია პროცენტული მნიშვნელობის პიქსელებში გადასაყვანად
 */
export function percentToPixels(percent: number, totalPixels: number): number {
  return (percent / 100) * totalPixels;
}