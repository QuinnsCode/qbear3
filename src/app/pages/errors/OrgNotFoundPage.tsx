// @/app/pages/errors/OrgNotFoundPage.tsx
export default function OrgNotFoundPage({ request }: { request: Request }) {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Organization Not Found</h1>
        <p>The organization "{slug}" doesn't exist.</p>
        <a href="/">Return to Home</a>
      </div>
    );
  }