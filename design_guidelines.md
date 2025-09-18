# Design Guidelines: French Business Simulation Platform

## Design Approach
**Reference-Based Approach**: Taking inspiration from financial platforms like Linear (for clean data visualization) and modern fintech apps, with emphasis on interactive graph visualization similar to network analysis tools.

## Core Design Elements

### A. Color Palette
**Primary Colors (Dark Mode Focus)**:
- Primary: 220 85% 60% (Professional blue for trust)
- Secondary: 210 15% 25% (Dark slate for backgrounds)
- Success: 142 71% 45% (Green for profits)
- Warning: 38 92% 50% (Orange for expenses)
- Danger: 0 84% 60% (Red for losses/taxes)

**Light Mode Variants**:
- Background: 210 20% 98%
- Surface: 0 0% 100%
- Text: 210 15% 25%

### B. Typography
- **Primary**: Inter (Google Fonts) - Clean, readable for financial data
- **Accent**: JetBrains Mono (Google Fonts) - For currency amounts and numbers
- **Hierarchy**: H1 (2xl), H2 (xl), Body (base), Caption (sm)

### C. Layout System
**Tailwind Spacing Units**: Primarily 2, 4, 6, 8, 12, 16
- Mobile-first responsive design
- Container max-width for readability
- Generous whitespace for complex financial data

### D. Component Library

**Navigation**:
- Bottom navigation bar for mobile (4-5 main sections)
- Floating action button for "Run Simulation"
- Breadcrumb navigation within simulation steps

**Data Visualization**:
- Interactive node-based graph (primary feature)
- Zoomable/pannable canvas with touch gestures
- Color-coded nodes by account type and importance
- Edge thickness representing money flow volume
- Mini-map for navigation orientation

**Forms & Inputs**:
- Multi-step wizard for company setup
- Currency input fields with French locale formatting
- Date pickers for fiscal calendar setup
- Toggle switches for legal form selection
- Pattern builders for recurring transactions

**Dashboard Cards**:
- KPI summary cards with trend indicators
- Account balance cards with color-coded status
- Tax obligation cards with deadline alerts
- Profit/loss breakdown with visual charts

**Simulation Controls**:
- Timeline scrubber for year progression
- Play/pause simulation controls
- Speed adjustment slider
- Reset/fork simulation options

### E. Mobile-Specific Considerations
- Touch-friendly graph interaction (pinch-to-zoom, pan)
- Swipeable card layouts for account details
- Collapsible sections for complex forms
- Sticky headers during long form flows
- Gesture-based navigation between simulation states

### F. Visual Hierarchy
- **Level 1**: Main simulation graph (70% of screen real estate)
- **Level 2**: Key metrics dashboard (persistent bottom sheet)
- **Level 3**: Account detail overlays (modal/drawer)
- **Level 4**: Settings and configuration (separate screens)

### G. Interaction Patterns
- Pull-to-refresh for updating simulation data
- Long-press on graph nodes for quick actions
- Swipe gestures for timeline navigation
- Haptic feedback for important state changes
- Progressive disclosure for complex financial rules

## Accessibility & Performance
- High contrast ratios for financial data readability
- Large touch targets (44px minimum)
- Screen reader support for graph data
- Optimized rendering for complex graph visualizations
- Offline capability for simulation calculations

This design prioritizes clarity in complex financial data presentation while maintaining an intuitive mobile-first experience focused on the core graph visualization feature.