// State Management
let updatesState = [];
let filteredUpdates = [];
let activeTypeFilter = 'all';
let searchQuery = '';
let selectedUpdate = null;

// DOM Cache
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const cacheIndicator = document.getElementById('cache-indicator');
const countTotal = document.getElementById('count-total');
const countFeatures = document.getElementById('count-features');
const countIssues = document.getElementById('count-issues');
const searchInput = document.getElementById('search-input');
const typeFiltersContainer = document.getElementById('type-filters');
const updatesGrid = document.getElementById('updates-grid');
const loadingIndicator = document.getElementById('loading-indicator');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const noResults = document.getElementById('no-results');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const tweetTypeBadge = document.getElementById('tweet-type-badge');
const tweetDate = document.getElementById('tweet-date');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCurrent = document.getElementById('char-current');
const charLimitIndicator = document.getElementById('char-limit-indicator');
const charWarning = document.getElementById('char-warning');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const shareTweetBtn = document.getElementById('share-tweet-btn');
const toastNotification = document.getElementById('toast-notification');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchUpdates();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh & Retry
    refreshBtn.addEventListener('click', () => fetchUpdates(true));
    retryBtn.addEventListener('click', () => fetchUpdates(true));

    // Live Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        filterAndRender();
    });

    // Filter Pills
    typeFiltersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
            // Remove active from all pills
            document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
            // Add active to clicked pill
            e.target.classList.add('active');
            
            activeTypeFilter = e.target.getAttribute('data-type');
            filterAndRender();
        }
    });

    // Close Modal Events
    closeModalBtn.addEventListener('click', closeModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeModal();
    });
    
    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Textarea character counting (Live)
    tweetTextarea.addEventListener('input', () => {
        updateCharCount(tweetTextarea.value);
    });

    // Copy to Clipboard
    copyTweetBtn.addEventListener('click', () => {
        const textToCopy = tweetTextarea.value;
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                showToast('Draft copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                showToast('Failed to copy draft.', true);
            });
    });

    // Share on X (Twitter Intent)
    shareTweetBtn.addEventListener('click', () => {
        const textToShare = tweetTextarea.value;
        const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(textToShare)}`;
        window.open(xUrl, '_blank', 'noopener,noreferrer');
    });
}

// Fetch Release Notes
async function fetchUpdates(forceRefresh = false) {
    showLoading(true);
    errorContainer.classList.add('hidden');
    noResults.classList.add('hidden');
    updatesGrid.classList.add('hidden');

    try {
        const response = await fetch(`/api/updates?refresh=${forceRefresh}`);
        const result = await response.json();

        if (result.success) {
            updatesState = result.updates;
            
            // Set Cache status indicator
            if (result.from_cache) {
                cacheIndicator.classList.remove('hidden');
            } else {
                cacheIndicator.classList.add('hidden');
            }
            
            updateStatsDashboard();
            filterAndRender();
        } else {
            throw new Error(result.error || 'Server returned an unsuccessful status');
        }
    } catch (err) {
        console.error('Error fetching updates:', err);
        errorMessage.textContent = err.message || 'Failed to fetch RSS feed from Google Cloud.';
        errorContainer.classList.remove('hidden');
    } finally {
        // Minimum delay to prevent flashing layout
        setTimeout(() => {
            showLoading(false);
        }, 400);
    }
}

// Stats Calculator
function updateStatsDashboard() {
    countTotal.textContent = updatesState.length;
    
    const featuresCount = updatesState.filter(u => u.type.toLowerCase() === 'feature').length;
    countFeatures.textContent = featuresCount;
    
    const issuesCount = updatesState.filter(u => 
        u.type.toLowerCase() === 'issue' || u.type.toLowerCase() === 'breaking'
    ).length;
    countIssues.textContent = issuesCount;
}

// Filter and Render updates list
function filterAndRender() {
    filteredUpdates = updatesState.filter(item => {
        // Filter by Type
        const matchesType = activeTypeFilter === 'all' || item.type.toLowerCase() === activeTypeFilter.toLowerCase();
        
        // Filter by Search Query (searches text, date, and type)
        const matchesSearch = searchQuery === '' || 
            item.text.toLowerCase().includes(searchQuery) ||
            item.date.toLowerCase().includes(searchQuery) ||
            item.type.toLowerCase().includes(searchQuery);
            
        return matchesType && matchesSearch;
    });

    renderCards();
}

// Render update cards
function renderCards() {
    updatesGrid.innerHTML = '';
    
    if (filteredUpdates.length === 0) {
        noResults.classList.remove('hidden');
        updatesGrid.classList.add('hidden');
        return;
    }

    noResults.classList.add('hidden');
    updatesGrid.classList.remove('hidden');

    filteredUpdates.forEach(update => {
        const card = document.createElement('article');
        const typeClass = `type-${update.type.toLowerCase()}`;
        const badgeClass = `badge-${update.type.toLowerCase()}`;
        
        card.className = `update-card ${typeClass}`;
        card.setAttribute('id', update.id);
        
        card.innerHTML = `
            <div class="card-header">
                <time class="card-date" datetime="${update.updated}">${update.date}</time>
                <span class="badge ${badgeClass}">${update.type}</span>
            </div>
            <div class="card-body">
                ${update.html}
            </div>
            <div class="card-footer">
                <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="read-more-link" title="Open official release notes in a new tab">
                    <span>Docs Link</span>
                    <svg class="icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </a>
                <button class="btn-card-tweet" onclick="openTweetModal('${update.id}')" aria-label="Share update on X">
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Draft Post</span>
                </button>
            </div>
        `;
        
        updatesGrid.appendChild(card);
    });
}

// Modal management
window.openTweetModal = function(id) {
    selectedUpdate = updatesState.find(u => u.id === id);
    if (!selectedUpdate) return;
    
    // Set Modal Data
    tweetTypeBadge.className = `badge badge-${selectedUpdate.type.toLowerCase()}`;
    tweetTypeBadge.textContent = selectedUpdate.type;
    tweetDate.textContent = selectedUpdate.date;
    
    // Set Tweet Content (from pre-generated backend template)
    tweetTextarea.value = selectedUpdate.tweet_draft;
    
    // Initialize character count calculations
    updateCharCount(tweetTextarea.value);
    
    // Show Modal
    tweetModal.classList.remove('hidden');
    // Allow animation to kick in
    setTimeout(() => {
        tweetModal.classList.add('show');
        tweetTextarea.focus();
    }, 10);
};

function closeModal() {
    tweetModal.classList.remove('show');
    setTimeout(() => {
        tweetModal.classList.add('hidden');
        selectedUpdate = null;
    }, 200); // match transition speed
}

// Calculate Twitter Character Length
// Twitter counts any URL as 23 characters regardless of length.
function calculateTwitterLength(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    let computedLength = text.length;
    let match;
    
    // Loop through all URLs in text
    while ((match = urlRegex.exec(text)) !== null) {
        computedLength = computedLength - match[0].length + 23;
    }
    
    return computedLength;
}

// Live character counting & limit validation
function updateCharCount(text) {
    const computedLen = calculateTwitterLength(text);
    charCurrent.textContent = computedLen;
    
    if (computedLen > 280) {
        charLimitIndicator.classList.add('error');
        charWarning.classList.remove('hidden');
        shareTweetBtn.disabled = true;
    } else {
        charLimitIndicator.classList.remove('error');
        charWarning.classList.add('hidden');
        shareTweetBtn.disabled = false;
    }
}

// Toast Alert
function showToast(message, isError = false) {
    toastNotification.textContent = message;
    
    if (isError) {
        toastNotification.style.backgroundColor = 'var(--color-breaking)';
    } else {
        toastNotification.style.backgroundColor = 'var(--color-feature)';
    }
    
    toastNotification.classList.remove('hidden');
    setTimeout(() => {
        toastNotification.classList.add('show');
    }, 10);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toastNotification.classList.remove('show');
        setTimeout(() => {
            toastNotification.classList.add('hidden');
        }, 300);
    }, 3000);
}

// Toggle loading state
function showLoading(isLoading) {
    if (isLoading) {
        refreshBtn.disabled = true;
        refreshIcon.classList.add('spinning');
        loadingIndicator.classList.remove('hidden');
    } else {
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spinning');
        loadingIndicator.classList.add('hidden');
    }
}
