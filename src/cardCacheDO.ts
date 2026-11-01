// src/cardCacheDO.ts
// Nothing reads or writes this DO any more: cards live in CARDS_KV (src/app/services/cardData).
// The class stays exported because wrangler.jsonc binds it and its migration created it; removing
// it needs a `deleted_classes` migration, which is a production change for the owner to approve.
import { DurableObject } from "cloudflare:workers";

export class CardCacheDO extends DurableObject {
  private readonly CARD_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    
    try {
      if (method === 'GET') {
        const type = url.searchParams.get('type');
        const key = url.searchParams.get('key');
        
        if (!key) return Response.json({ error: 'Missing key' }, { status: 400 });
        
        const value = await this.ctx.storage.get(key);
        return Response.json({ value });
      }
      
      if (method === 'POST') {
        const { type, key, value, ttl } = await request.json() as any;
        
        if (!key || !value) {
          return Response.json({ error: 'Missing key or value' }, { status: 400 });
        }
        
        await this.ctx.storage.put(key, value);
        return Response.json({ success: true });
      }
      
      if (method === 'DELETE') {
        const key = url.searchParams.get('key');
        if (!key) return Response.json({ error: 'Missing key' }, { status: 400 });
        
        await this.ctx.storage.delete(key);
        return Response.json({ success: true });
      }
      
      return new Response('Method not allowed', { status: 405 });
      
    } catch (error: any) {
      return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
    }
  }
}

export default CardCacheDO;