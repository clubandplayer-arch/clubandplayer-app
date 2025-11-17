# Post-merge housekeeping (squash & merge)

Use this checklist after a squash & merge to keep local and remote branches tidy and to confirm the app still ships:

1. **Sync the target branch**
   - `git checkout main`
   - `git pull`
   - For any in-flight branch, `git rebase main` or recreate it from the updated `main` to avoid history conflicts.

2. **Clean up merged branches**
   - Remove locally: `git branch -D <branch>`.
   - Remove remotely if no longer needed: `git push origin --delete <branch>`.

3. **Verify build/deploy readiness**
   - Run the production build locally: `pnpm build` (uses Turbopack).
   - Check that required env vars are present for your host (e.g. Supabase, post bucket, Sentry, etc.).

4. **Resume development from a fresh branch**
   - Create a new branch off `main` for the next task (e.g. media uploads, feed fixes, beta prep): `git checkout -b <topic>`.

Keep this checklist close to reduce merge friction and catch regressions quickly.
