import express from "express";
import fetch from "node-fetch";

const app = express();
const UPSTREAM_TIMEOUT_MS = 10_000;
const GITHUB_PAGE_SIZE = 100;

class UpstreamError extends Error {
  constructor(message, status, upstreamStatus) {
    super(message);
    this.status = status;
    this.upstreamStatus = upstreamStatus;
  }
}

async function fetchGitHubJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "StudentTrackerApp",
      Accept: "application/vnd.github+json",
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
      })
    },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });

  if (response.status === 404) {
    throw new UpstreamError("GitHub user not found", 404, 404);
  }
  if (response.status === 403 || response.status === 429) {
    throw new UpstreamError("GitHub rate limit reached. Try again in a few minutes.", 503, response.status);
  }
  if (!response.ok) {
    throw new UpstreamError("GitHub API request failed", 502, response.status);
  }

  return response.json();
}

async function fetchAllPublicRepositories(githubUser) {
  const repositories = [];

  for (let page = 1; ; page += 1) {
    const pageData = await fetchGitHubJson(
      `https://api.github.com/users/${encodeURIComponent(githubUser)}/repos?per_page=${GITHUB_PAGE_SIZE}&sort=updated&page=${page}`
    );

    if (!Array.isArray(pageData)) {
      throw new Error("GitHub returned an unexpected repository response");
    }

    repositories.push(...pageData.filter((repo) => !repo.private));
    if (pageData.length < GITHUB_PAGE_SIZE) {
      return repositories;
    }
  }
}

async function getGitHub(githubUser) {
  const [githubProfile, repositories] = await Promise.all([
    fetchGitHubJson(
      `https://api.github.com/users/${encodeURIComponent(githubUser)}`
    ),
    fetchAllPublicRepositories(githubUser)
  ]);

  return {
    profile: {
      username: githubProfile.login,
      name: githubProfile.name,
      bio: githubProfile.bio,
      avatarUrl: githubProfile.avatar_url,
      profileUrl: githubProfile.html_url,
      location: githubProfile.location,
      company: githubProfile.company,
      blog: githubProfile.blog,
      email: githubProfile.email,
      publicRepos: githubProfile.public_repos,
      followers: githubProfile.followers,
      following: githubProfile.following,
      createdAt: githubProfile.created_at
    },
    username: githubProfile.login,
    repos: repositories.map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      homepage: repo.homepage,
      language: repo.language,
      topics: repo.topics ?? [],
      stars: repo.stargazers_count,
      watchers: repo.watchers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      size: repo.size,
      defaultBranch: repo.default_branch,
      visibility: repo.visibility,
      isFork: repo.fork,
      isArchived: repo.archived,
      license: repo.license?.spdx_id ?? null,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at
    }))
  };
}

async function getLeetCode(leetcodeUser) {
  const lcRes = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "StudentTrackerApp",
      Referer: "https://leetcode.com"
    },
    body: JSON.stringify({
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            githubUrl
            twitterUrl
            linkedinUrl
            profile {
              ranking
              realName
              userAvatar
              aboutMe
              countryName
              company
              school
              websites
            }
            submitStatsGlobal {
              acSubmissionNum { difficulty count submissions }
            }
            tagProblemCounts {
              fundamental { tagName tagSlug problemsSolved }
              intermediate { tagName tagSlug problemsSolved }
              advanced { tagName tagSlug problemsSolved }
            }
            badges { id displayName icon creationDate }
            contributions { points questionCount }
          }
        }
      `,
      variables: { username: leetcodeUser }
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });

  if (!lcRes.ok) {
    throw new UpstreamError("LeetCode API request failed", 502, lcRes.status);
  }

  const lcData = await lcRes.json();
  const matchedUser = lcData.data?.matchedUser;
  // LeetCode answers an unknown username with a GraphQL error and a null user.
  if (!matchedUser) {
    throw new UpstreamError("LeetCode user not found", 404);
  }
  if (lcData.errors?.length) {
    throw new UpstreamError("LeetCode returned a GraphQL error", 502);
  }

  return {
    username: matchedUser.username,
    profile: {
      ranking: matchedUser.profile?.ranking ?? null,
      realName: matchedUser.profile?.realName ?? null,
      avatarUrl: matchedUser.profile?.userAvatar ?? null,
      about: matchedUser.profile?.aboutMe ?? null,
      country: matchedUser.profile?.countryName ?? null,
      company: matchedUser.profile?.company ?? null,
      school: matchedUser.profile?.school ?? null,
      websites: matchedUser.profile?.websites ?? [],
      githubUrl: matchedUser.githubUrl ?? null,
      twitterUrl: matchedUser.twitterUrl ?? null,
      linkedinUrl: matchedUser.linkedinUrl ?? null
    },
    ranking: matchedUser.profile?.ranking ?? null,
    solved: matchedUser.submitStatsGlobal?.acSubmissionNum ?? [],
    solvedByTopic: {
      fundamental: matchedUser.tagProblemCounts?.fundamental ?? [],
      intermediate: matchedUser.tagProblemCounts?.intermediate ?? [],
      advanced: matchedUser.tagProblemCounts?.advanced ?? []
    },
    badges: matchedUser.badges ?? [],
    contributions: matchedUser.contributions ?? null
  };
}

function sendError(res, error) {
  if (error.name === "TimeoutError" || error.name === "AbortError") {
    return res.status(504).json({ error: "A stats provider timed out" });
  }

  if (error instanceof UpstreamError) {
    return res.status(error.status).json({
      error: error.message,
      ...(error.upstreamStatus && { upstreamStatus: error.upstreamStatus })
    });
  }

  return res.status(502).json({ error: "Unable to retrieve student stats" });
}

app.get("/api/github/:githubUser", async (req, res) => {
  try {
    return res.json(await getGitHub(req.params.githubUser));
  } catch (error) {
    return sendError(res, error);
  }
});

app.get("/api/leetcode/:leetcodeUser", async (req, res) => {
  try {
    return res.json(await getLeetCode(req.params.leetcodeUser));
  } catch (error) {
    return sendError(res, error);
  }
});

app.get("/api/student/:githubUser/:leetcodeUser", async (req, res) => {
  const { githubUser, leetcodeUser } = req.params;

  try {
    const [github, leetcode] = await Promise.all([
      getGitHub(githubUser),
      getLeetCode(leetcodeUser)
    ]);
    return res.json({ github, leetcode });
  } catch (error) {
    return sendError(res, error);
  }
});

export default app;
