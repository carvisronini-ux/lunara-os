// /home/carvisronini-ux/lunara-os/services/distribution/instagram-adapter.ts

export interface PublishResult {
  success: boolean;
  platform: string;
  postId?: string;
  error?: string;
}

export class InstagramAdapter {
  private igUserId: string;
  private accessToken: string;

  constructor() {
    this.igUserId = process.env.INSTAGRAM_USER_ID || '';
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';

    if (!this.igUserId || !this.accessToken) {
      console.error('❌ Instagram credentials are missing in environment variables');
    }
  }

  /**
   * აქვეყნებს სურათს Instagram-ზე.
   * დანერგილია დაყოვნება და განმეორებითი მცდელობები (Retry Logic) Meta-ს სერვერების დაყოვნებისა და სპამის ფილტრების თავიდან ასაცილებლად.
   * 
   * @param imageUrl - სურათის საჯარო URL (Meta API მოითხოვს საჯარო ლინკს, არა პირდაპირ Buffer-ს)
   * @param caption - პოსტის ტექსტი
   */
  async publishPost(imageUrl: string, caption: string): Promise<PublishResult> {
    try {
      if (!this.igUserId || !this.accessToken) {
        throw new Error('Instagram credentials are not configured');
      }

      console.log(`📸 Starting Instagram publish for image: ${imageUrl}`);

      // ნაბიჯი 1: მედიის კონტეინერის შექმნა
      const containerResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            caption: caption,
            access_token: this.accessToken
          })
        }
      );

      const containerData = await containerResponse.json();

      if (!containerData.id) {
        console.error('❌ Failed to create media container:', containerData);
        throw new Error(`Failed to create media container: ${JSON.stringify(containerData)}`);
      }

      const creationId = containerData.id;
      console.log(`✅ Media container created with ID: ${creationId}.`);

      // ⚠️ კრიტიკული დაყოვნება: Meta-ს სერვერებს სჭირდებათ დრო სურათის დასამუშავებლად.
      // ამის გარეშე ხშირად ვიღებთ "Media is not ready for publishing" შეცდომას.
      console.log('⏳ Waiting for Instagram to process the media (3 seconds)...');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // ნაბიჯი 2: კონტეინერის გამოქვეყნება განმეორებითი მცდელობებით (Retry Logic)
      let publishData: any = null;
      let attempts = 0;
      const maxAttempts = 3;
      let isPublished = false;

      while (attempts < maxAttempts && !isPublished) {
        attempts++;
        console.log(`📤 Attempting to publish (Attempt ${attempts}/${maxAttempts})...`);

        const publishResponse = await fetch(
          `https://graph.facebook.com/v18.0/${this.igUserId}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: creationId,
              access_token: this.accessToken
            })
          }
        );

        publishData = await publishResponse.json();

        if (publishData.id) {
          isPublished = true;
          console.log(`🎉 Successfully published to Instagram! Post ID: ${publishData.id}`);
        } else {
          const errorMsg = publishData.error?.message || 'Unknown error';
          console.warn(`⚠️ Publish attempt ${attempts} failed: ${errorMsg}`);
          
          // თუ ეს არის "not ready" შეცდომა (subcode 2207027), ვცდილობთ თავიდან.
          // თუ სხვა შეცდომაა (მაგ. არასწორი ტოკენი), ვწყვეტთ ცდებს, რომ არ ჩაითვალოს სპამად.
          if (publishData.error?.error_subcode === 2207027 || errorMsg.includes('not ready')) {
            if (attempts < maxAttempts) {
              console.log(`⏳ Waiting 5 seconds before next retry...`);
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }
          } else {
            break; // სხვა ტიპის კრიტიკული შეცდომაა, არ ვცდილობთ თავიდან
          }
        }
      }

      if (!isPublished) {
        throw new Error(`Failed to publish media after ${maxAttempts} attempts: ${JSON.stringify(publishData)}`);
      }

      return {
        success: true,
        platform: 'instagram',
        postId: publishData.id
      };

    } catch (error) {
      console.error('❌ Instagram Publish Error:', error);
      return {
        success: false,
        platform: 'instagram',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}