A minimal Next.js App Router project as create-next-app writes it, plus what a real team adds: its own
`components/ui/button.tsx` and `lib/` (as a shadcn project has), and an `/orders` page reading its own data layer.
`zz-meridian adopt` is tested against it: install, type check and build must pass afterwards, and the team's files
must be unchanged.
