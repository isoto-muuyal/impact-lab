# Design Guidelines: Social Project Management Platform

## Design Approach
**Selected System:** Material Design 3 with modern refinements  
**Rationale:** Provides robust patterns for forms, dashboards, and data display while maintaining approachability for social impact focus. Balances professionalism with warmth.

**Design Principles:**
- Clarity and efficiency for task completion
- Welcoming interface that encourages collaboration
- Clear visual hierarchy for role-based content
- Consistent patterns across authentication and dashboards

---

## Typography

**Font Selection:** Inter (Google Fonts)
- **Headings:** Inter SemiBold (600)
  - H1: 2.5rem (40px) - Page titles
  - H2: 2rem (32px) - Section headers
  - H3: 1.5rem (24px) - Card titles, subsections
- **Body:** Inter Regular (400)
  - Large: 1.125rem (18px) - Hero text, important descriptions
  - Base: 1rem (16px) - Standard content, form labels
  - Small: 0.875rem (14px) - Helper text, metadata
- **UI Elements:** Inter Medium (500) for buttons, navigation items

---

## Spacing System

**Tailwind Units:** Standardize on 4, 6, 8, 12, 16, 20, 24
- **Micro spacing (gaps, padding):** p-4, gap-4
- **Component spacing:** p-6, p-8
- **Section spacing:** py-12, py-16
- **Large breakpoints:** py-20, py-24

**Grid/Layout:**
- Container: max-w-7xl mx-auto px-4
- Form containers: max-w-md mx-auto
- Dashboard content: max-w-6xl mx-auto

---

## Component Library

### Authentication Pages (Login/Register)

**Layout:**
- Centered card design (max-w-md)
- Split-screen option: Left side brand/illustration, right side form (desktop only)
- Card elevation with subtle shadow
- Generous padding: p-8

**Form Components:**
- Full-width input fields with clear labels above
- Input height: h-12
- Rounded corners: rounded-lg
- Role selector: Radio button group with card-style options showing role descriptions
- Primary CTA button: Full width, h-12, rounded-lg
- Secondary text links below form

### Role-Based Dashboards

**Layout Structure:**
- Top navigation bar: h-16, sticky
- Sidebar navigation (desktop): w-64, collapsible
- Main content area: Flexible with appropriate max-width
- Grid layouts for cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

**Dashboard Cards:**
- Rounded corners: rounded-xl
- Padding: p-6
- Subtle border and shadow
- Header with icon + title
- Metric display or content area
- Optional action button/link

**Navigation:**
- Top bar: Logo left, user menu right
- Sidebar: Role-specific menu items with icons
- Active state: Background accent, bold text
- Hover state: Subtle background change

### User Profile

**Layout:**
- Two-column desktop (md:grid-cols-2)
- Profile header: Avatar (large, rounded-full), name, role badge
- Information sections in cards
- Editable fields: Toggle between view/edit modes
- Form inputs consistent with auth pages

**Profile Sections:**
- Personal Information card
- Professional Details card (skills, experience)
- Location & Timezone card
- Each card: p-6, rounded-xl, separate visual containers

### Welcome/Hero Sections

**Structure:**
- Height: min-h-[400px] (not full viewport)
- Centered content with max-w-3xl
- Role-specific headline (H1) + supporting text
- Primary action button(s)
- Background: Gradient or subtle pattern (no image needed for role dashboards)

For future marketing pages: Use impactful imagery showing community/collaboration

---

## Specific Component Details

**Buttons:**
- Primary: h-12, px-8, rounded-lg, font-medium
- Secondary: h-12, px-8, rounded-lg, border-2
- Text links: Underline on hover
- Icon buttons: w-10 h-10, rounded-full

**Input Fields:**
- Height: h-12
- Padding: px-4
- Border: 2px solid
- Rounded: rounded-lg
- Labels: mb-2, font-medium
- Helper text: text-sm, mt-1

**Badges (Role indicators):**
- Inline-flex, px-3, py-1
- Rounded-full
- Text-sm, font-medium
- Different visual treatment per role

**Data Tables (future):**
- Zebra striping for rows
- Sticky header
- Responsive: Stack on mobile
- Row height: min-h-[60px]

**Cards:**
- Standard: rounded-xl, p-6, border or shadow
- Hover state: Subtle lift (shadow increase)
- Clickable cards: cursor-pointer, transition

---

## Responsive Behavior

**Breakpoints:**
- Mobile: Base styles
- Tablet: md: (768px)
- Desktop: lg: (1024px)

**Key Adaptations:**
- Sidebar: Hidden on mobile, hamburger menu
- Cards: Stack to single column on mobile
- Forms: Maintain max-w-md even on desktop
- Tables: Horizontal scroll or card view on mobile
- Navigation: Bottom tab bar option for mobile

---

## Images

**Where to Include:**
- Login/Register split-screen (optional): Illustration representing collaboration, community building
- Welcome dashboard hero: Team collaboration imagery or abstract shapes representing connection
- Empty states: Friendly illustrations prompting action

**Hero Image (Future Marketing):**
- Large hero image showing diverse team collaborating on social projects
- Overlay with semi-transparent dark gradient for text readability
- CTA buttons with backdrop-blur-sm background

---

## Accessibility

- Minimum touch target: 44x44px for all interactive elements
- Form labels always visible (not placeholder-dependent)
- Clear focus states with visible outline
- Semantic HTML structure with proper heading hierarchy
- ARIA labels for icon-only buttons
- Color contrast ratios meeting WCAG AA standards (delegated to color implementation phase)