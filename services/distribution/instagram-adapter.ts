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
        console.error('❌ Instagram credentials are missing in .env file');
      }
    }
  
    /**
     * აქვეყნებს სურათს Instagram-ზე.
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
          throw new Error(`Failed to create media container: ${JSON.stringify(containerData)}`);
        }
  
        const creationId = containerData.id;
        console.log(`✅ Media container created with ID: ${creationId}. Publishing...`);
  
        // ნაბიჯი 2: კონტეინერის გამოქვეყნება
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
  
        const publishData = await publishResponse.json();
  
        if (!publishData.id) {
          throw new Error(`Failed to publish media: ${JSON.stringify(publishData)}`);
        }
  
        console.log(`🎉 Successfully published to Instagram! Post ID: ${publishData.id}`);
  
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