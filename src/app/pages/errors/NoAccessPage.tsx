// @/app/pages/errors/NoAccessPage.tsx
export default function NoAccessPage({ request }: { request: Request }) {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Access Denied</h1>
        <p>You don't have access to the organization "{slug}".</p>
        <a href="/">Return to Home</a>
      </div>
    );
  }