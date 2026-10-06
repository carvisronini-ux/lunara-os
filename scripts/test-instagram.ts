// /home/carvisronini-ux/lunara-os/scripts/test-instagram.ts
import { InstagramAdapter } from '../services/distribution/instagram-adapter';

async function main() {
  console.log('🧪 Starting Instagram test post...');
  
  // ✅ FIX: გადავცემთ .env ცვლადებს InstagramAdapter-ს
  const adapter = new InstagramAdapter(
    process.env.INSTAGRAM_USER_ID || '',
    process.env.INSTAGRAM_ACCESS_TOKEN || ''
  );
  
  // უსაფრთხო, პროფესიონალური სურათი Unsplash-იდან
  // ეს არის მისტიკური/კოსმოსური თემატიკის სურათი
  const imageUrl = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1080&h=1350&fit=crop';
  const caption = '🌌 The universe is whispering your name today. Listen closely. ✨\n\n#LUNARA #CosmicEnergy #Astrology #DailyHoroscope #Universe';

  console.log('📤 Sending request to Instagram API...');
  console.log('Image URL:', imageUrl);
  console.log('Caption length:', caption.length);

  try {
    const result = await adapter.publishPost(imageUrl, caption);
    
    if (result.success) {
      console.log('🎉 SUCCESS! Post published successfully.');
      console.log('Post ID:', result.postId);
      console.log('URL:', `https://www.instagram.com/p/${result.postId}`);
    } else {
      console.error('❌ FAILED! Error:', result.error);
    }
  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error);
  }
}

main();