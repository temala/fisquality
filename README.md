# Fisquality - French Business Simulation Platform

## Overview

Fisquality is a French business simulation platform that allows users to simulate year-long financial operations for French businesses. The application provides interactive fiscal account visualization and comprehensive tax calculations. Users can set up companies with different legal forms (SARL, SAS, EURL, SA, SASU), define revenue and expense patterns, and run simulations to visualize financial flows through an interactive node-based graph system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library in "New York" style
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Dark/light mode toggle with CSS variables and localStorage persistence
- **Mobile-First Design**: Responsive layout with dedicated mobile navigation

### Component Structure
- **UI Components**: Complete shadcn/ui component library with custom styling
- **Graph Visualization**: Custom HTML5 Canvas-based interactive graph for financial data visualization
- **Multi-Step Forms**: Wizard-style company setup with validation
- **Authentication Flow**: Landing page for unauthenticated users, dashboard for authenticated users

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with proper error handling and logging middleware
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Replit OpenID Connect integration with Passport.js

### Data Storage
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM with TypeScript schema definitions
- **Schema Design**: 
  - User management (required for Replit Auth)
  - Company profiles with French business legal forms
  - Revenue and expense patterns for simulation
  - Account balances and tax calculations
- **Migrations**: Drizzle Kit for schema management

### Business Logic
- **French Tax System**: Built-in support for French business taxation including VAT calculations
- **Legal Forms**: Support for SARL, SAS, EURL, SA, SASU with different rules
- **Pattern System**: Recurring revenue and expense patterns with frequency options
- **Simulation Engine**: Year-long financial projections with monthly/quarterly breakdowns

### Security & Authentication
- **Authentication Provider**: Replit Auth with OpenID Connect
- **Session Security**: Secure HTTP-only cookies with expiration
- **Authorization**: User-scoped data access with ownership validation
- **CSRF Protection**: Built-in session-based protection

### Development Tools
- **Type Safety**: Full TypeScript coverage across frontend and backend
- **Code Quality**: Shared utilities and consistent patterns
- **Development Experience**: Vite HMR, Replit integration, runtime error overlay
- **Build Process**: Separate client and server builds with ESBuild

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Database ORM and query builder
- **express**: Web server framework
- **@tanstack/react-query**: Data fetching and state management
- **wouter**: Lightweight React routing

### UI & Styling
- **@radix-ui/***: Headless UI primitives for accessibility
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Authentication & Security
- **openid-client**: OpenID Connect implementation
- **passport**: Authentication middleware
- **connect-pg-simple**: PostgreSQL session store
- **express-session**: Session management

### Development & Build
- **vite**: Frontend build tool and development server
- **typescript**: Type system
- **@replit/vite-plugin-runtime-error-modal**: Replit development tools
- **esbuild**: Server bundling

### External Services
- **Replit Authentication**: Integrated OAuth provider
- **Neon PostgreSQL**: Serverless database hosting
- **Google Fonts**: Typography (Inter, JetBrains Mono)

The application follows a modern full-stack TypeScript architecture with strong emphasis on French business compliance, interactive data visualization, and mobile-responsive design.