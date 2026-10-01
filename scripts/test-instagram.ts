import { InstagramAdapter } from '../services/distribution/instagram-adapter';

async function testInstagramPost() {
  console.log('🧪 Starting Instagram test post...');
  
  const adapter = new InstagramAdapter();
  
  // უსაფრთხო, პროფესიონალური სურათი Unsplash-იდან
  // ეს არის მისტიკური/კოსმოსური თემატიკის სურათი
  const testImageUrl = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80';
  
  // მარტივი, პროფესიონალური caption
  const testCaption = `🌙 Welcome to LUNARA

Your daily cosmic signal awaits.

#LUNARA #Tarot #Astrology`;

  console.log('📸 Image URL:', testImageUrl);
  console.log('📝 Caption:', testCaption);
  console.log('---');

  const result = await adapter.publishPost(testImageUrl, testCaption);

  if (result.success) {
    console.log('✅ SUCCESS! Post published to Instagram');
    console.log('🆔 Post ID:', result.postId);
    console.log('🔗 View at: https://www.instagram.com/p/' + result.postId);
  } else {
    console.error('❌ FAILED:', result.error);
    console.log('\n🔍 Troubleshooting tips:');
    console.log('1. Check if Access Token is still valid (expires in 1 hour in Dev mode)');
    console.log('2. Verify Instagram account is Business type');
    console.log('3. Check Meta Developer App permissions');
  }
}

testInstagramPost();