# Zopathy

The first public preview of Zopathy: a continuous social feed, connected posts, a composer, customized profiles, and red / teal themes.

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

The feed still uses illustrative sample creators and posts. Posts, comments, follows, bookmarks, and exploration history remain in each visitor's browser and are not shared with other visitors. Signed-in users have separate browser storage per account. Site theme remains a browser preference. Media cards are visual previews without playback. Local-file data does not transfer automatically to zopathy.live.

`config.js` contains only a public Supabase URL and publishable key. Never add SMTP credentials, database passwords, Supabase secret keys, or service-role keys to this repository. The bundled Supabase SDK is pinned to 2.117.3. Authentication requires HTTPS, except for localhost development.

## Source

- `index.html`, `style.css`, `app.js`, `profile.js`: application
- `account.js`, `config.js`, `supabase-2.117.3.js`: account integration
- `logo.svg`, `favicon.svg`: Zopathy identity
- `CNAME`: custom-domain configuration

## Official references

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Custom domains and DNS](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
