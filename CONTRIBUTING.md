# Contributing to PoWR

Thank you for helping build PoWR. This guide explains the complete contribution process, from creating a fork to submitting a pull request that is ready for review.

## Before you begin

You will need:

- Git
- Node.js and npm
- PostgreSQL for backend development
- A GitHub account
- A GitHub OAuth App if you need to test authentication locally

Never commit passwords, API keys, OAuth secrets, private keys, database credentials, or populated `.env` files.

## 1. Choose or describe the work

Before starting a large change:

1. Check the existing issues and pull requests to avoid duplicating work.
2. Open an issue describing the problem or proposed feature when one does not already exist.
3. Agree on the intended behavior before investing in a large implementation.

Small bug fixes and documentation improvements may be submitted directly.

## 2. Fork the repository

Open the [PoWR repository](https://github.com/AnneAdhiambo/PoWR) and select **Fork** in the upper-right corner. GitHub will create a copy under your account.

Clone your fork, replacing `YOUR_USERNAME` with your GitHub username:

```bash
git clone git@github.com:YOUR_USERNAME/PoWR.git
cd PoWR
```

If you use HTTPS instead of SSH:

```bash
git clone https://github.com/YOUR_USERNAME/PoWR.git
cd PoWR
```

Your fork is named `origin`. Add the official repository as `upstream`:

```bash
git remote add upstream git@github.com:AnneAdhiambo/PoWR.git
git remote -v
```

The output should show your fork for `origin` and the official PoWR repository for `upstream`.

## 3. Create a branch from the latest `develop`

Contributor pull requests should normally target `develop`. The `main` branch is reserved for reviewed release changes unless a maintainer asks you to use it.

Update your local branches before beginning:

```bash
git fetch upstream
git switch develop
git pull --ff-only upstream develop
```

Create a focused branch for your change:

```bash
git switch -c feature/short-description
```

Use a descriptive prefix:

- `feature/` for new functionality
- `fix/` for bug fixes
- `docs/` for documentation
- `refactor/` for behavior-preserving code changes
- `test/` for test-only changes

Do not make contribution commits directly on `main` or `develop`.

## 4. Install the project

PoWR contains separate root, frontend, and backend packages. Install their locked dependencies from the repository root:

```bash
npm ci
npm --prefix frontend ci
npm --prefix backend ci
```

Copy the environment templates:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

On PowerShell:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item backend/.env.example backend/.env
```

Fill in only the values needed for your work. Keep the local frontend and backend defaults on ports `3000` and `3001` unless you have a reason to change them.

## 5. Prepare the database

Create a PostgreSQL database and set `DATABASE_URL` in `backend/.env`.

Run the database migrations:

```bash
npm --prefix backend run migrate
```

If your change modifies the database schema, include an idempotent migration with the change. A migration must be safe to run during deployment and safe to run again.

## 6. Run PoWR locally

Use two terminals from the repository root.

Terminal 1 — backend:

```bash
npm run dev:backend
```

Terminal 2 — frontend:

```bash
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000). The backend should be available at `http://localhost:3001`.

## 7. Make a focused change

Keep each pull request limited to one clear purpose. While working:

- Follow the existing black-and-orange matte visual language.
- Reuse the established components and design tokens.
- Use Untitled UI icons for interface icons where an appropriate icon exists.
- Preserve mobile and keyboard behavior.
- Add or update tests for changed behavior.
- Do not reformat or rename unrelated files.
- Do not include generated files or local environment changes.

Check your work frequently:

```bash
git status
git diff
```

## 8. Run the relevant checks

Run the checks affected by your change before opening a pull request.

Frontend:

```bash
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
```

Backend:

```bash
npm --prefix backend run test
npm --prefix backend run build
```

Smart contracts and root tests:

```bash
npm test
```

Frontend end-to-end tests, when the affected flows require them:

```bash
npm --prefix frontend run test:e2e
```

If a check cannot run in your environment, state exactly which check was skipped and why in the pull request.

## 9. Commit the change

Review the files that will be committed:

```bash
git status
git diff --check
git diff
```

Stage only the intended files:

```bash
git add path/to/file
```

Write a concise commit message that describes the result:

```bash
git commit -m "feat: add project nomination search"
```

Common commit prefixes are `feat`, `fix`, `docs`, `refactor`, `test`, and `chore`.

## 10. Sync before pushing

Bring in recent upstream changes without creating an unnecessary merge commit:

```bash
git fetch upstream
git rebase upstream/develop
```

If Git reports conflicts:

1. Open each conflicted file and resolve the marked sections.
2. Stage each resolved file with `git add path/to/file`.
3. Continue with `git rebase --continue`.
4. Run the relevant checks again.

To safely stop the rebase and return to the previous state:

```bash
git rebase --abort
```

## 11. Push your branch

Push the contribution branch to your fork:

```bash
git push -u origin feature/short-description
```

If you rebased a branch that was already pushed, update your fork with:

```bash
git push --force-with-lease
```

Use `--force-with-lease`, never plain `--force`. Never force-push `main`, `develop`, or another contributor's branch.

## 12. Open the pull request

GitHub will show a link to open a pull request after the push. You can also open your fork, select **Compare & pull request**, and configure:

- **Base repository:** `AnneAdhiambo/PoWR`
- **Base branch:** `develop`
- **Head repository:** your fork
- **Compare branch:** your contribution branch

Before selecting **Create pull request**, confirm that the **Files changed** tab contains only the work you intended to submit.

Use a clear title, such as:

```text
feat: add project nomination search
```

Include the following in the description:

```markdown
## What changed

- Describe the behavior added or corrected.

## Why

- Explain the problem this solves.

## How to verify

1. List the exact steps reviewers should follow.

## Checks

- [ ] Frontend lint/tests/build, if affected
- [ ] Backend tests/build, if affected
- [ ] Root or contract tests, if affected

## Screenshots

Add before-and-after screenshots for visible UI changes.

Closes #ISSUE_NUMBER
```

Use a draft pull request when the implementation is incomplete or you need early feedback.

## 13. Respond to review

Push review fixes to the same branch. The pull request updates automatically:

```bash
git add path/to/updated-file
git commit -m "fix: address review feedback"
git push
```

Resolve conversations only after the feedback has been addressed. Do not open a replacement pull request for ordinary review changes.

## Avoiding accidental reverts and duplicate pull requests

- Check whether a pull request is already merged before trying to merge or recreate it.
- A merged pull request cannot be merged a second time.
- If a merged change was reverted, restore it by reverting the revert in a new branch and pull request.
- Do not use `git reset --hard` or force-push to repair shared branch history.
- Do not mix unrelated fixes into a restoration or revert pull request.
- Always inspect the base branch and **Files changed** before creating the pull request.
- Ask a maintainer before reverting a merged pull request.

## Reporting security problems

Do not publish exploitable security vulnerabilities in a public issue. Contact the maintainers privately with a clear description, reproduction steps, affected versions, and any suggested mitigation.

## Need help?

Open a focused GitHub issue and include your operating system, Node.js version, the command you ran, the complete non-sensitive error message, and what you already tried.
