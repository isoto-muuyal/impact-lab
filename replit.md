# GA4SI - Social Project Management Platform

## Overview

GA4SI is a social project management platform designed for social entrepreneurs in Spanish-speaking communities. The platform connects users with mentors, provides access to courses, and facilitates social impact project acceleration. It features role-based dashboards for three user types: usuarios (users), mentors, and facilitadores (facilitators).

The application is built as a full-stack TypeScript project with a React frontend and Express backend, using PostgreSQL for data persistence and Replit Auth for authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Design System**: Material Design 3 with modern refinements, Inter font family
- **Theme Support**: Light/dark mode via ThemeProvider component

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: REST API with `/api` prefix
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js
- **Session Management**: express-session with PostgreSQL store (connect-pg-simple)
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Data Storage
- **Database**: PostgreSQL (required via DATABASE_URL environment variable)
- **Schema Location**: `shared/schema.ts` using Drizzle ORM definitions
- **Key Tables**:
  - `sessions` - Session storage (required for Replit Auth)
  - `users` - User accounts with profile info
  - `userProfiles` - Extended user profile data
  - `roles` - Role definitions (usuario, mentor, facilitador)
  - `userRoles` - User-role assignments

### Authentication Flow
- Uses Replit Auth via OpenID Connect
- Session-based authentication with PostgreSQL session store
- Protected routes use `isAuthenticated` middleware
- User data available via `/api/auth/user` endpoint

### Project Structure
```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components (shadcn/ui)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and query client
│   │   └── pages/        # Page components
├── server/               # Express backend
│   ├── db.ts            # Database connection
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Data access layer
│   └── replitAuth.ts    # Authentication setup
├── shared/              # Shared code
│   └── schema.ts        # Drizzle database schema
└── migrations/          # Database migrations
```

### Build System
- **Development**: Vite dev server with HMR
- **Production Build**: esbuild for server, Vite for client
- **Scripts**: `npm run dev`, `npm run build`, `npm run db:push`

## External Dependencies

### Database
- **PostgreSQL**: Required, connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: For schema migrations (`npm run db:push`)

### Authentication
- **Replit Auth**: OpenID Connect provider
- **Required Environment Variables**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `SESSION_SECRET` - Session encryption key
  - `REPL_ID` - Replit instance identifier
  - `ISSUER_URL` - OIDC issuer (defaults to https://replit.com/oidc)

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **react-hook-form** with **zod**: Form handling and validation
- **date-fns**: Date utilities
- **embla-carousel-react**: Carousel component
- **recharts**: Charting library
- **vaul**: Drawer component

### Development Tools
- **TypeScript**: Type checking
- **Tailwind CSS**: Utility-first styling
- **PostCSS**: CSS processing
- **Vite plugins**: Replit-specific development tools