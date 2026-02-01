import { type RequestInfo } from "rwsdk/worker";
import { 
  getFriends, 
  getFriendRequests, 
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUsers 
} from "@/app/serverActions/social/friends";

export async function handler({ request, ctx }: RequestInfo) {
  const url = new URL(request.url);
  const method = request.method;

  // Check auth
  if (!ctx?.user?.id) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // GET requests
  if (method === 'GET') {
    const action = url.searchParams.get('action');
    
    if (action === 'list') {
      const friends = await getFriends(ctx.user.id);
      return Response.json(friends);
    }
    
    if (action === 'requests') {
      const requests = await getFriendRequests(ctx.user.id);
      return Response.json(requests);
    }
    
    if (action === 'search') {
      const query = url.searchParams.get('query') || '';
      const users = await searchUsers(query);
      return Response.json(users);
    }
  }

  // POST requests
  if (method === 'POST') {
    const body = await request.json() as any;

    if (body.action === 'send') {
      const result = await sendFriendRequest(ctx.user.id, body.toUserId);
      return Response.json(result);
    }
    
    if (body.action === 'accept') {
      const result = await acceptFriendRequest(ctx.user.id, body.requestId);
      return Response.json(result);
    }
    
    if (body.action === 'reject') {
      const result = await rejectFriendRequest(ctx.user.id, body.requestId);
      return Response.json(result);
    }
    
    if (body.action === 'remove') {
      const result = await removeFriend(ctx.user.id, body.friendId);
      return Response.json(result);
    }
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}