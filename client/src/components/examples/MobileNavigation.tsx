import MobileNavigation from '../MobileNavigation';

export default function MobileNavigationExample() {
  return (
    <div className="h-screen bg-background">
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Content Area</h2>
        <p className="text-muted-foreground">
          This demonstrates the mobile navigation component with floating action button.
        </p>
      </div>
      <MobileNavigation />
    </div>
  );
}