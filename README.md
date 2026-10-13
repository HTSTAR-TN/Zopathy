# Zopathy

Zopathy is a shared social network with accounts, public posts, connected conversations, customizable profiles, and red / teal themes.

## Hosting

This repository hosts the static site through GitHub Pages. No dependencies or build step are required.

In **Settings → Pages**, use **Deploy from a branch**, select **main** and **/(root)**, and save. The root `index.html` is the entry point and `.nojekyll` disables Jekyll processing.

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

Horizontal exploration updates only the active post viewer. Author details, navigation controls, social actions, and neighboring feed entries retain their containers while content slides for 240 ms. Text posts use a compact, top-aligned reading layout and the viewer smoothly shrinks to their natural height; photos, videos, audio, and custom sections retain appropriate layouts. A relationship label shows shared topics or member connections. Back retraces one step with a reverse slide, including the final step to the original post; Main feed returns to the root immediately. Vertical scrolling remains native. Reduced-motion preferences disable the slide, and departing media is paused. Custom layouts can grow naturally rather than being forced into a fixed card height.

`responsive-check.html` embeds the actual public site in a narrow viewport for responsive QA. It has no sample runtime or additional dependencies.

## Community sidebar and handles

The sidebar recommends up to five people you do not follow. Trending groups topics in recently loaded community posts from the last seven days, ranking post volume, distinct authors, and likes/comments/reposts. Select a trend to search shared posts. This is a lightweight feed-based ranking, not a global analytics service.

Customize profile → About you lets members choose a unique, lowercase handle (3–24 letters, numbers, or underscores). Supabase enforces uniqueness and owner-only updates. New accounts use short generated defaults; existing custom handles are preserved. Run the handle update migration for an existing deployment.

## Personal Profile Designer

Profiles now render in a dedicated canvas iframe, with a script-disabled sandbox and a restrictive Content Security Policy. The site header, navigation, authentication, Follow, Customize profile, and Simplified view controls remain outside it. The owner and visitors render the same saved appearance. Feed cards and rabbit-hole navigation retain their existing styling.

Customize profile opens a private draft with five editable templates: Classic Zopathy, Minimalist, Retro, Modern, and Creative. Controls cover page/panel/text/accent/link/border/hover colors, gradients and optimized backgrounds, local font families and typography, borders, shadows, transparency, spacing, width, post columns, and hover effects. Desktop and mobile previews use the actual profile renderer. Existing avatars, banners, name colors, identity fields, and crop tools are retained. Save profile persists the draft to Supabase; Discard leaves the published profile alone. Reset canvas resets canvas settings while retaining identity and uploaded images.

Advanced CSS is limited to the isolated canvas, with an 8,000-character/100-rule limit. External URLs, imports, font loading, HTML, JavaScript, CSS escapes, and executable constructs are rejected. Only @media, @supports, and @keyframes are supported. Browser CSS parsing supplies the final graceful fallback for unsupported declarations. Animations run at most three iterations with bounded durations; reduced-motion preferences disable them. The editor includes supported selectors and examples, and a visitor can always choose Simplified view outside the canvas.

Version 1 design settings are stored as structured `appearance.design` data in the existing profile record. Existing appearance fields remain intact. Run `Zopathy-Profile-Designer-Validation.sql` for an existing database; the account schema includes the same validation for a new setup. Owner-only RLS remains unchanged. Background uploads are decoded and converted to WebP, with a maximum 1,600-pixel edge and 500 KB data URL; image inputs are limited to 20 MB/60 megapixels.

This release includes visual customization and isolated CSS layout freedom. A drag-and-drop section editor, dedicated per-device section ordering, undo/redo, and syntax highlighting are not implemented yet. No widgets or arbitrary HTML/JavaScript are supported.


## Public groups

Groups provides shared community discovery, public discussion feeds, membership, and owner moderation. Anyone can browse; signed-in members can create groups or join to post, comment, like, and repost. Bookmarks remain private. Group posts appear in the group discussion and author profiles rather than replacing the main feed. Friendly links use `?group=group-slug`.

Owners can edit the name, description, rules, banner, and accent, remove/restore group posts, restrict/reinstate members, and archive/reopen the group. Owners cannot leave their own group, alter another author's content, or restore a post the author privately removed. Restricted accounts can still browse public content. Archives preserve history and stop new participation.

For a new database, install the Account and Social schemas first, then run `Zopathy-Groups-Schema.sql` once in Supabase SQL Editor. For this live deployment the groups migration is already installed. It adds groups, memberships, and optional group/moderation fields to existing posts; existing posts stay in the main feed. Supabase policies and RPCs enforce access independently of the browser UI. Uploaded banners use the existing media bucket and are cropped to 3:1.

The first release supports public groups only. There are no private groups, invitations, group chat, additional moderator roles, or push notifications. Discovery loads 50 groups at a time, discussions 25 posts at a time, and member/moderation lists up to 100/50 entries. Refresh updates a group's shared data. Creating a group is limited to 20 active owned groups per account.

Tests cover anonymous browsing, atomic creation, repeat joins, real counts, nonmember restrictions, role forgery, owner controls, author privacy, bans, leaving, and archive/reopen. Database fixtures were rolled back, so no test groups or posts remain. Frontend tests cover discovery, escaped content, group posting, routing, draft preservation, and account reset.


## Profile Studio

The Profile Designer now opens a dedicated full-viewport Profile Studio. Profile, Appearance, Layout, Typography, Effects, and Advanced categories show one inspector panel at a time beside the main preview. All previous identity, handle, image upload/crop/removal, signature themes/colors, templates, canvas colors/backgrounds, layout, typography, effects, and safe custom CSS controls remain. Hidden panels stay mounted, so switching categories does not discard values. Saved appearance records and database validation are unchanged.

The preview remains the existing script-disabled canvas. Parent-side selection highlights the banner, avatar, text, or sections and opens the corresponding inspector. Custom CSS stays inside the canvas and never styles Studio. Desktop/mobile preview switching, save, discard, individual resets, canvas reset, and default-appearance restoration are supported. Restoring appearance retains identity and images. Draft undo/redo retains up to 24 snapshots, coalescing inputs over 250 ms; text fields retain native typing undo. Unsaved changes are clearly labeled, and navigation away warns about the private draft. Expensive preview rendering remains debounced at 100 ms.

Mobile uses a compact preview above a horizontally scrollable category selector and inspector. This release does not add widgets or a drag-and-drop positioning engine: section selection opens the existing spacing/width/column controls, and isolated CSS remains available for custom positioning.


## Friends and direct messages

Friendships are mutual accepted connections, separate from follows. Member profiles have Add friend and Message controls. Friends shows incoming requests, accepted friends, and sent requests, with accept/decline/cancel/unfriend actions. Unfriending preserves existing messages and follows.

DMs are open by default. Messages > Who can message you? lets a member enable Only friends can message me. The backend checks the recipient's preference for every new message. Only the sender and recipient can read a conversation, including after unfriending. Requests and message preferences are private. Text messages support 4,000 characters, 50-message history pages, retry-safe UUIDs, memory-only drafts, and a five-second refresh while Messages is open and the tab is visible. No messages or drafts are stored as browser-local social fallback. Messages are stored in Supabase and are not end-to-end encrypted. Demo accounts cannot receive messages or friend requests.

Install Zopathy-Friends-Messages-Schema.sql once after the existing Account and Social schemas. The live migration is installed. This release does not include attachments, typing indicators, push notifications, message editing/deletion, or group chat.
