# Student Tracker API

An Express API that combines a student's latest public GitHub repositories with
their LeetCode ranking and accepted submission counts.

## Setup

Requires Node.js 18 or later.

```sh
npm install
npm start
```

The server listens on port `4000` by default (the MGM exam website uses `3000`). Set `PORT` to use a different
port. Optionally set `GITHUB_TOKEN` to increase GitHub API rate limits.

For development, `npm run dev` restarts the server when source files change.

## Endpoints

```text
GET /api/github/:githubUser                  GitHub profile and public repos
GET /api/leetcode/:leetcodeUser              LeetCode stats
GET /api/student/:githubUser/:leetcodeUser   Both in one response
```

The JEMS screens in the mobile app use the first two (`src/lib/jems-sources.ts`), so each profile is
verified on its own. Set `JEMS_SERVER` in the app's `src/config.ts` to this server's address.
An unknown user returns `404`; a GitHub rate limit returns `503`.

Example:

```sh
curl http://localhost:4000/api/student/octocat/someLeetCodeUser
```

The response contains a GitHub account summary and all of the account's public
repositories, including descriptions, links, languages, topics, stars, forks,
issue counts, license, and timestamps. It also includes LeetCode profile
details, social links, ranking, accepted submission counts, badges, and
contribution stats. `leetcode.solvedByTopic` groups solved question counts by
LeetCode's fundamental, intermediate, and advanced tags. Each tag includes its
name, slug, and number of solved problems (for example, Array, Greedy, or
Dynamic Programming). These are LeetCode's tag categories, not question
difficulty levels. Upstream API errors return `502`; provider timeouts return
`504`.
