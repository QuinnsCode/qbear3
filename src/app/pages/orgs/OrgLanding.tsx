// @/app/pages/orgs/OrgLanding.tsx
import type { RequestInfo } from "rwsdk/worker";

export default function OrgLanding({ ctx, request }: RequestInfo) {
  const { organization, user, userRole } = ctx;
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Welcome to {organization?.name}</h1>
      <p>Hello {user?.name}! Your role: {userRole}</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          {/* <a href="/dashboard">Dashboard</a> */}
          <a href="/search/test123">Search Orders</a>
        </div>
      </div>
    </div>
  );
}