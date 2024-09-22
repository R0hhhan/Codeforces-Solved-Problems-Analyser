// DOM element selections
const form = document.getElementById("form");
const handle = document.querySelector(".user-id");
const mnRating = document.getElementById("minRating");
const mxRating = document.getElementById("maxRating");
const allTopics = document.querySelectorAll(".topics");
const ul = document.querySelector(".problem-list");
const recentSearchesList = document.getElementById("recentSearches");

// Cache for recent searches
const MAX_RECENT_SEARCHES = 5;
let recentSearchesSet = new Set(JSON.parse(localStorage.getItem("recentSearches")) || []);

// Debounce function
const debounce = (func, delay) => {
  let debounceTimer;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  }
};

// Load recent searches from cache


// Add recent search to the dropdown
const addRecentSearch = (username) => {
  const li = document.createElement("li");
  li.textContent = username;
  li.classList.add("dropdown-item");
  li.addEventListener("click", () => {
    handle.value = username;
    recentSearchesList.innerHTML = "";
  });
  recentSearchesList.appendChild(li);
};

// Save new search to cache
const saveRecentSearch = (username) => {
  recentSearchesSet.delete(username); // Remove if exists
  recentSearchesSet.add(username); // Add to the beginning

  // Keep only the MAX_RECENT_SEARCHES most recent
  recentSearchesSet = new Set([...recentSearchesSet].slice(0, MAX_RECENT_SEARCHES));

  localStorage.setItem("recentSearches", JSON.stringify([...recentSearchesSet]));
};

// Update rating display
const updateRatingDisplay = () => {
  document.getElementById("min-rating-value").textContent = mnRating.value;
  document.getElementById("max-rating-value").textContent = mxRating.value;
};

// Autocomplete functionality
const autocomplete = debounce(() => {
  const input = handle.value.toLowerCase();
  if (input.length > 0) {
    const matches = [...recentSearchesSet].filter(search =>
      search.toLowerCase().startsWith(input)
    );
    recentSearchesList.innerHTML = "";
    matches.slice(0, MAX_RECENT_SEARCHES).forEach(addRecentSearch);
  } else {
    recentSearchesList.innerHTML = "";
  }
}, 100);

// Event listeners
mnRating.addEventListener("input", updateRatingDisplay);
mxRating.addEventListener("input", updateRatingDisplay);
handle.addEventListener("input", autocomplete);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  ul.innerHTML = "";
  const validProblems = new Array();
  const userId = handle.value.trim();
  if (userId) {
    saveRecentSearch(userId);
  }
  const minrating = parseInt(mnRating.value);
  const maxrating = parseInt(mxRating.value);
  const requiredTopics = new Array();

  for (let topic of allTopics) {
    if (topic.checked) {
      requiredTopics.push(topic.value);
    }
  }

  try {
    const userData = await axios.get(
      `https://codeforces.com/api/user.status?handle=${userId}`
    );

    const anyTopic = requiredTopics.indexOf("any") != -1;
    const allSubmission = userData.data.result;

    for (let submission of allSubmission) {
      if (submission.verdict !== "OK") continue;
      const rating = submission.problem.rating;

      if (rating < minrating || rating > maxrating) continue;

      for (let topic of requiredTopics) {
        if (anyTopic || submission.problem.tags.indexOf(topic) != -1) {
          validProblems.push(submission.problem);
          break;
        }
      }
    }

    const added = new Set();
    for (let problem of validProblems) {
      if (!added.has(problem.name)) {
        added.add(problem.name);

        const li = document.createElement("li");
        const aTag = document.createElement("a");
        aTag.href = `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
        aTag.target = "_blank";
        const nameSpan = document.createElement("span");
        nameSpan.textContent = problem.name;
        nameSpan.className = "problem-name";

        const ratingSpan = document.createElement("span");
        ratingSpan.textContent = `Rating: ${problem.rating}`;
        ratingSpan.className = "problem-rating";

        aTag.appendChild(nameSpan);
        aTag.appendChild(ratingSpan);

        li.appendChild(aTag);
        ul.appendChild(li);
      }
    }

    if (validProblems.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No problems found matching the criteria.";
      ul.appendChild(li);
    }
  } catch (error) {
    console.error("Error fetching user data", error);
    const li = document.createElement("li");
    li.textContent = "Error fetching data. Please check the handle and try again.";
    ul.appendChild(li);
  }
});

// Initialize
updateRatingDisplay();