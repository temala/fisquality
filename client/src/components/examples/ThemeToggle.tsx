import ThemeToggle from '../ThemeToggle';

export default function ThemeToggleExample() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <span>Theme Toggle:</span>
        <ThemeToggle />
      </div>
      <p className="text-muted-foreground">Click the button to toggle between light and dark modes.</p>
    </div>
  );
}