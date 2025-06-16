// 配置你的 GitHub 用户名
const GITHUB_USERNAME = 'ben-daming'; // 替换为你的 GitHub 用户名

// 语言颜色映射
const languageColors = {
    'JavaScript': '#f1e05a',
    'Python': '#3572A5',
    'Java': '#b07219',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'TypeScript': '#2b7489',
    'C++': '#f34b7d',
    'C': '#555555',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'Vue': '#4fc08d',
    'React': '#61dafb'
};

async function fetchRepositories() {
    const repoGrid = document.getElementById('repoGrid');
    
    try {
        // 使用 GitHub API 获取仓库列表
        const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=20`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const repos = await response.json();
        
        // 清空加载提示
        repoGrid.innerHTML = '';
        
        // 过滤掉 fork 的仓库
        const originalRepos = repos.filter(repo => !repo.fork);
        
        if (originalRepos.length === 0) {
            repoGrid.innerHTML = '<div class="error">未找到仓库</div>';
            return;
        }
        
        // 渲染仓库
        originalRepos.forEach(repo => {
            const repoCard = createRepoCard(repo);
            repoGrid.appendChild(repoCard);
        });
        
    } catch (error) {
        console.error('获取仓库失败:', error);
        repoGrid.innerHTML = `<div class="error">获取仓库失败: ${error.message}</div>`;
    }
}

function createRepoCard(repo) {
    const card = document.createElement('div');
    card.className = 'repo-card';
    
    const languageColor = languageColors[repo.language] || '#666';
    
    card.innerHTML = `
        <div class="repo-header">
            <a href="${repo.html_url}" target="_blank" class="repo-name">
                ${repo.name}
            </a>
            ${repo.private ? '<span class="repo-private">Private</span>' : ''}
        </div>
        
        ${repo.description ? `<p class="repo-description">${repo.description}</p>` : ''}
        
        <div class="repo-stats">
            ${repo.language ? `
                <div class="repo-stat">
                    <span class="language-color" style="background-color: ${languageColor}"></span>
                    <span>${repo.language}</span>
                </div>
            ` : ''}
            
            <div class="repo-stat">
                <span>⭐</span>
                <span>${repo.stargazers_count}</span>
            </div>
            
            <div class="repo-stat">
                <span>🍴</span>
                <span>${repo.forks_count}</span>
            </div>
            
            <div class="repo-stat">
                <span>📅</span>
                <span>${new Date(repo.updated_at).toLocaleDateString('zh-CN')}</span>
            </div>
        </div>
    `;
    
    return card;
}

// 页面加载完成后获取仓库数据
document.addEventListener('DOMContentLoaded', fetchRepositories);