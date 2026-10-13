# Zopathy

Zopathy is a shared social network with accounts, public posts, connected conversations, customizable profiles, and red / teal themes.

## Hosting

This repository hosts the static site through GitHub Pages. No dependencies or build step are required.

In **Settings â†’ Pages**, use **Deploy from a branch**, select **main** and **/(root)**, and save. The root `index.html` is the entry point and `.nojekyll` disables Jekyll processing.

The custom domain is **zopathy.live**. Set this in GitHub's Pages settings before configuring domain-provider DNS. Use these apex A records:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | htstar-tn.github.io |

Keep unrelated email and verification records. Replace conflicting web-hosting records at the same hostname. Enable **Enforce HTTPS** in Pages settings once GitHub provisions the certificate. DNS and HTTPS availability can take up to 24 hours.

## Release boundaries

Email accounts use Supabase Auth with email verification, sign-in, sign-out, and password recovery. Resend delivers authentication emails. Profile customization is stored in Supabase and follows the account across devices. Public profiles contain no email addresses; row-level security permits each user to update only their own profile.

Posts, replies, likes, reposts, follows, bookmarks, exploration history, and account preferences are stored in Supabase. The feed contains real user content and counts. Photos, audio, and video use Supabase Storage with a 6 MB file limit and native playback controls. Removed posts and replies can be restored by their authors.

Posts, profile information, uploaded media, likes, reposts, follows, and connections are public. Bookmarks, exploration history, and account preferences are private to their owners. The browser never stores social changes as a fallback when the backend fails. A signed-out theme preference may remain in browser storage. Previous local posts can be reviewed individually before being published; they are not uploaded automatically.

Explore follows member-created connections and offers related posts based on a shared topic or author. Public links open specific posts. Search queries Supabase, and the feed supports loading more posts. A background check every 30 seconds announces available updates; it does not interrupt an open editor or change the feed underneath a reader.

`config.js` contains only a public Supabase URL and publishable key. Never add SMTP credentials, database passwords, Supabase secret keys, or service-role keys to this repository. The bundled Supabase SDK is pinned to 2.117.3. Authentication requires HTTPS, except for localhost development.

## Source

- `index.html`, `style.css`, `app.js`, `profile.js`: application
- `account.js`, `config.js`, `supabase-2.117.3.js`: account integration
- `social.js`, `social.css`: shared social data, uploads, interactions, and views
- `logo.svg`, `favicon.svg`: Zopathy identity
- `CNAME`: custom-domain configuration

## Official references

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Custom domains and DNS](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

## Rabbit-hole viewer

Horizontal exploration updates only the active post viewer. Author details, navigation controls, social actions, and neighboring feed entries retain their containers while content slides for 240 ms. Text posts use a compact, top-aligned reading layout and the viewer smoothly shrinks to their natural height; photos, videos, audio, and custom sections retain appropriate layouts. A relationship label shows shared topics or member connections. Back retraces one step; Main feed returns to the root immediately. Vertical scrolling remains native. Reduced-motion preferences disable the slide, and departing media is paused. Custom layouts can grow naturally rather than being forced into a fixed card height.

`responsive-check.html` embeds the actual public site in a narrow viewport for responsive QA. It has no sample runtime or additional dependencies.
