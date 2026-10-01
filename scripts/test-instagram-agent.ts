// scripts/test-instagram-agent.ts
import { InstagramAgent } from '../agents/content/instagram-agent';

async function runTest() {
  console.log("🚀 [DEBUG] სკრიპტი დაიწყო!");
  console.log("🧪 ვიწყებთ Instagram Agent-ის სრულ ენდ-ტუ-ენდ (E2E) ტესტირებას...\n");
  
  const agent = new InstagramAgent();
  
  // სატესტო თემა (შეგიძლია შეცვალო, რაც გინდა)
  const testTopic = "A mystical glowing tarot card floating in deep cosmic space, dark luxury aesthetic, highly detailed, cinematic lighting, 8k resolution";
  
  console.log(`📝 თემა: "${testTopic}"\n`);
  console.log("⏳ გთხოვთ, მოიცადოთ... (სურათის გენერაციას და ატვირთვას შეიძლება 10-20 წამი დასჭირდეს)\n");
  
  // ვუშვებთ აგენტს 'dark-luxury' სტილით
  const result = await agent.createAndPublish(testTopic, 'dark-luxury');
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 საბოლოო შედეგი:");
  console.log("=".repeat(60));
  
  if (result.success) {
    console.log("✅ წარმატება! პოსტი გამოქვეყნდა Instagram-ზე.");
    console.log(`🖼️ სურათის ლინკი (Supabase): ${result.imageUrl}`);
    console.log(`📝 კაფშენი:\n${result.caption}`);
    console.log(`🆔 პოსტის ID: ${result.postId}`);
    console.log(`🔗 ნახე აქ: https://www.instagram.com/p/${result.postId}`);
  } else {
    console.error("❌ ვერ მოხერხდა გამოქვეყნება.");
    console.error(`შეცდომა: ${result.error}`);
    console.log("\n💡 რჩევა: შეამოწმე, არის თუ არა Instagram Access Token კვლავ ვალიდური (Dev mode-ში ის 1 საათში იწურება). თუ ამოიწურა, Graph API Explorer-იდან ახალი უნდა აიღო და .env-ში ჩაანაცვლო.");
  }
}

// სკრიპტის გაშვება
runTest().catch((err) => {
  console.error("💥 კრიტიკული შეცდომა სკრიპტის გაშვებისას:", err);
});