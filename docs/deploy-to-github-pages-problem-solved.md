# Deploy to GitHub Pages – Problem Solved

## 1. Symptoms
- `https://tulamia311.github.io/food-shop/` rendered a blank page.
- Chrome console showed 404s for `assets/index-*.css` and `assets/index-*.js`, plus `vite.svg`.
- Network tab confirmed requests were hitting `/assets/...` at the site root and failing.

## 2. Root Cause
GitHub Pages serves the project under `/food-shop/`, but the Vite build assumed `/` as the site root. All asset URLs were emitted as `/assets/...`, so the browser fetched `https://tulamia311.github.io/assets/...` and received 404 responses.

## 3. Fix Implemented
1. Set the Vite base path to the repository subdirectory:
   ```js
   // vite.config.js
   export default defineConfig({
     base: '/food-shop/',
     plugins: [react()],
   })
   ```
2. Reinstalled dependencies (vite binary missing) and ran `npm run build` to regenerate `dist/`.
3. Redeployed the new `dist/` bundle to GitHub Pages. Assets now resolve to `/food-shop/assets/...` and load successfully.

## 4. Deployment Workflow (master → gh-pages)
1. **Build on main branch:**
   ```bash
   git checkout master
   npm install        # if node_modules missing
   npm run build      # produces fresh dist/
   ```
2. **Create/update deployment branch (e.g., `gh-pages`):**
   ```bash
   git checkout --orphan gh-pages
   git reset --hard
   cp -R dist/* .
   git add .
   git commit -m "[DOC] publish static build"
   git push -u origin gh-pages --force
   ```
   *(Use `git worktree` if you prefer not to wipe the working tree.)*
3. **Configure GitHub Pages:** Repo Settings → Pages → “Deploy from a branch” → `gh-pages` / `/ (root)`.
4. **Verify:** Visit `https://<user>.github.io/food-shop/` once the Pages build completes.

> **Note:** Keep `.env` values local or in CI secrets. Vite reads `VITE_*` variables at build time; they are baked into the bundle, so never commit real credentials.
