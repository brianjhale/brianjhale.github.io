const PERSONAL_USERNAME = 'brianjhale'; 
const ORG_NAME = 'native-state-tools';
const CACHE_KEY = 'github_portfolio_data';
const CACHE_EXPIRY = 15 * 60 * 1000; // Cache for 15 minutes

async function fetchAllProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  // 1. Check for valid cached data in localStorage
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cacheTime = localStorage.getItem(`${CACHE_KEY}_time`);

  if (cachedData && cacheTime && (Date.now() - cacheTime < CACHE_EXPIRY)) {
    renderProjects(JSON.parse(cachedData));
    return;
  }

  // 2. Fetch fresh repository data from GitHub API
  try {
    const [userRes, orgRes] = await Promise.all([
      fetch(`https://api.github.com/users/${PERSONAL_USERNAME}/repos?sort=updated&per_page=10`),
      fetch(`https://api.github.com/orgs/${ORG_NAME}/repos?sort=updated&per_page=10`)
    ]);

    // Handle rate limiting (60 requests/hr unauthenticated)
    if (userRes.status === 403 || orgRes.status === 403) {
      grid.innerHTML = '<p style="color: #f87171;">GitHub API rate limit reached. Please check back in a few minutes.</p>';
      return;
    }

    const userRepos = userRes.ok ? await userRes.json() : [];
    const orgRepos = orgRes.ok ? await orgRes.json() : [];

    const taggedUser = userRepos.map(repo => ({ ...repo, badgeText: 'Personal', isOrg: false }));
    const taggedOrg = orgRepos.map(repo => ({ ...repo, badgeText: ORG_NAME, isOrg: true }));

    // Merge, filter out forks, empty descriptions, AND the portfolio repo itself
    const allRepos = [...taggedUser, ...taggedOrg]
      .filter(repo => 
        !repo.fork && 
        repo.description && 
        repo.name !== `${PERSONAL_USERNAME}.github.io`
      )
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    // Save to localStorage for local testing reloads
    localStorage.setItem(CACHE_KEY, JSON.stringify(allRepos));
    localStorage.setItem(`${CACHE_KEY}_time`, Date.now());

    renderProjects(allRepos);

  } catch (err) {
    console.error('Error fetching repos:', err);
    grid.innerHTML = '<p style="color: #f87171;">Unable to load projects from GitHub right now.</p>';
  }
}

function renderProjects(repos) {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  if (repos.length === 0) {
    grid.innerHTML = '<p>No public repositories found.</p>';
    return;
  }

  grid.innerHTML = ''; // Clear loading indicator

  repos.forEach(repo => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div>
        <div class="card-header">
          <h3>${repo.name}</h3>
          <span class="badge ${repo.isOrg ? 'org' : ''}">${repo.badgeText}</span>
        </div>
        <p>${repo.description || 'No description provided.'}</p>
      </div>
      <div>
        <div class="tags">
          ${repo.language ? `<span class="tag">● ${repo.language}</span>` : ''}
          <span class="tag">★ ${repo.stargazers_count}</span>
        </div>
        <div class="links">
          <a href="${repo.html_url}" target="_blank" rel="noopener">View Repository →</a>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', fetchAllProjects);