#!/bin/sh
# Brings the database schema up to date, then seeds the first admin (safe to re-run).
set -e

if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "Applying migrations..."
  npx prisma migrate deploy
else
  echo "No prisma/migrations folder; syncing schema with db push..."
  npx prisma db push --skip-generate
fi

echo "Seeding..."
npx prisma db seed
