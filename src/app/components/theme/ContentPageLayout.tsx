// @/app/components/theme/ContentPageLayout.tsx
import { ReactNode } from 'react';
import { 
  FantasyBackground, 
  FantasyCard, 
  FantasyTitle, 
  FantasyText,
  WizardStudy 
} from '@/app/components/theme/FantasyTheme';

interface ContentPageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  variant?: 'cave' | 'study' | 'adventure';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showDecorations?: boolean;
}

export function ContentPageLayout({
  title,
  subtitle,
  children,
  variant = 'study',
  maxWidth = 'xl',
  showDecorations = true
}: ContentPageLayoutProps) {
  
  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl'
  };

  return (
    <FantasyBackground variant={variant}>
      <div className="min-h-screen flex flex-col">
        
        {/* Header with decorations */}
        <div className="relative">
          {showDecorations && (
            <>
              {/* Top left decoration */}
              <div className="absolute top-4 left-4 hidden lg:block">
                <div className="text-4xl opacity-50">🏰</div>
              </div>
              
              {/* Top right decoration */}
              <div className="absolute top-4 right-4 hidden lg:block">
                <div className="text-4xl opacity-50">📜</div>
              </div>
            </>
          )}
          
          {/* Header content */}
          <div className="relative z-10 py-12 px-4">
            <div className={`mx-auto ${maxWidthClasses[maxWidth]} text-center`}>
              <FantasyTitle size="xl" className="mb-3">
                {title}
              </FantasyTitle>
              {subtitle && (
                <FantasyText variant="primary" className="text-lg">
                  {subtitle}
                </FantasyText>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 pb-12 px-4">
          <div className={`mx-auto ${maxWidthClasses[maxWidth]}`}>
            <FantasyCard className="p-8 lg:p-12" glowing={true}>
              <div className="prose prose-invert prose-amber max-w-none
                prose-headings:text-amber-200 
                prose-headings:font-serif
                prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-8 prose-h1:first:mt-0
                prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-6
                prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
                prose-p:text-amber-100/90 prose-p:leading-relaxed prose-p:mb-4
                prose-a:text-amber-300 prose-a:no-underline hover:prose-a:text-amber-100 hover:prose-a:underline
                prose-strong:text-amber-200 prose-strong:font-semibold
                prose-ul:my-4 prose-ul:list-disc prose-ul:list-inside
                prose-ol:my-4 prose-ol:list-decimal prose-ol:list-inside
                prose-li:text-amber-100/90 prose-li:mb-2
                prose-code:text-amber-300 prose-code:bg-black/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-black/50 prose-pre:border prose-pre:border-amber-700/30 prose-pre:rounded-lg
                prose-blockquote:border-l-4 prose-blockquote:border-amber-700 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-amber-200/80
              ">
                {children}
              </div>
            </FantasyCard>
          </div>
        </div>

        {/* Footer decorations */}
        {showDecorations && (
          <div className="relative py-8">
            <div className={`mx-auto ${maxWidthClasses[maxWidth]} px-4`}>
              <div className="flex items-center justify-center gap-8 text-3xl opacity-40">
                <span>⚔️</span>
                <span>🗡️</span>
                <span>🛡️</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </FantasyBackground>
  );
}

// Specialized layout for changelog with timeline
export function ChangelogLayout({
  title = "Chronicles of Updates",
  subtitle = "A record of our journey through the realm",
  children
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <ContentPageLayout 
      title={title} 
      subtitle={subtitle}
      maxWidth="lg"
      variant="study"
    >
      {children}
    </ContentPageLayout>
  );
}

// Specialized layout for legal pages
export function LegalLayout({
  title,
  lastUpdated,
  children
}: {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}) {
  return (
    <ContentPageLayout 
      title={title}
      subtitle={lastUpdated ? `Last updated: ${lastUpdated}` : undefined}
      maxWidth="xl"
      variant="study"
      showDecorations={false}
    >
      {children}
    </ContentPageLayout>
  );
}

// Specialized layout for about page
export function AboutLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <ContentPageLayout 
      title="About Our Guild"
      subtitle="Learn about our quest and the adventurers behind it"
      maxWidth="xl"
      variant="adventure"
    >
      {children}
    </ContentPageLayout>
  );
}