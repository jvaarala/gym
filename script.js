// Status helper (inserts a lightweight banner above workouts)
const workoutsContainer = document.getElementById('workouts');
function setStatus(message, type = 'info') {
    // Remove an existing banner first
    const existing = document.getElementById('status-banner');
    if (existing) existing.remove();
    if (!message) return;
    const banner = document.createElement('div');
    banner.id = 'status-banner';
    banner.style.margin = '0 0 1rem 0';
    banner.style.padding = '0.75rem 1rem';
    banner.style.borderRadius = '12px';
    banner.style.fontWeight = '600';
    banner.style.boxShadow = 'var(--card-shadow)';
    banner.style.background = type === 'error' ? '#ffe6e6' : '#eef2ff';
    banner.style.color = type === 'error' ? '#991b1b' : '#3730a3';
    banner.innerHTML = message;
    workoutsContainer.parentNode.insertBefore(banner, workoutsContainer);
}

// Load CSV from file using fetch (works when served over http from same origin)
async function loadCSV(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
        throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
    }
    return await res.text();
}

// Parse CSV
function parseCSV(csv) {
    // Normalize newlines and split lines
    const lines = csv.replace(/\r\n?/g, '\n').trim().split('\n');
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
        // Handle quoted fields
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);

        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = (values[i] ?? '').trim();
        });
        return obj;
    });
}

// Group exercises by day
function groupByDay(exercises) {
    const grouped = {};
    exercises.forEach(exercise => {
        const day = exercise.activityDay;
        if (!grouped[day]) {
            grouped[day] = [];
        }
        grouped[day].push(exercise);
    });
    return grouped;
}

// Format exercise details
function formatExerciseDetails(exercise) {
    let details = '';

    const sets = exercise.setsMin === exercise.setsMax
        ? exercise.setsMin
        : `${exercise.setsMin}-${exercise.setsMax}`;

    const reps = exercise.repsMin === exercise.repsMax
        ? exercise.repsMin
        : `${exercise.repsMin}-${exercise.repsMax}`;

    details += `
        <div class="detail-item">
            <span class="detail-label">Sets:</span>
            <span class="detail-value">${sets}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">${exercise.repsUnit === 'repetitions' ? 'Reps' : 'Duration'}:</span>
            <span class="detail-value">${reps} ${exercise.repsUnit === 'repetitions' ? '' : exercise.repsUnit}</span>
        </div>
    `;

    return details;
}

// Format video links
function formatVideoLinks(exercise) {
    const videos = [];
    if (exercise.instructionVideo1) {
        videos.push(exercise.instructionVideo1);
    }
    if (exercise.instructionVideo2) {
        videos.push(exercise.instructionVideo2);
    }

    if (videos.length === 0) {
        return '';
    }

    let html = '<div class="video-links">';
    videos.forEach((url, index) => {
        html += `
            <a href="${url}" target="_blank" class="video-link">
                Video ${index + 1}
            </a>
        `;
    });
    html += '</div>';

    return html;
}

// Render workouts
function renderWorkouts(exercises) {
    const groupedByDay = groupByDay(exercises);
    const workoutsContainer = document.getElementById('workouts');

    Object.entries(groupedByDay).forEach(([day, dayExercises]) => {
        dayExercises.sort((a, b) => parseInt(a.activityOrderNr) - parseInt(b.activityOrderNr));

        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';

        let exercisesHTML = '';
        dayExercises.forEach(exercise => {
            const isWarmup = exercise.warmup === '1';
            const warmupClass = isWarmup ? 'warmup' : '';
            const warmupBadge = isWarmup ? '<span class="warmup-badge">Warmup</span>' : '';

                // Generate a unique ID for each exercise for button state
                const exerciseId = `${day}-${exercise.activityOrderNr}-${exercise.activity}`.replace(/\s+/g, '-');
                exercisesHTML += `
                    <div class="exercise ${warmupClass}" data-exercise-id="${exerciseId}">
                        <div class="exercise-name">
                            ${exercise.activity}
                            ${warmupBadge}
                        </div>
                        <div class="exercise-details">
                            ${formatExerciseDetails(exercise)}
                        </div>
                        ${formatVideoLinks(exercise)}
                        <button class="done-btn" id="done-btn-${exerciseId}">Done</button>
                    </div>
                `;
        });

        dayCard.innerHTML = `
            <div class="day-header">
                <div class="day-icon"></div>
                <h2 class="day-title">${day}</h2>
            </div>
            ${exercisesHTML}
        `;

        workoutsContainer.appendChild(dayCard);
    });

        // Add event listeners for Done buttons
        document.querySelectorAll('.done-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const exerciseDiv = btn.closest('.exercise');
                if (exerciseDiv.classList.contains('done')) {
                    exerciseDiv.classList.remove('done');
                    btn.textContent = 'Done';
                } else {
                    exerciseDiv.classList.add('done');
                    btn.textContent = '✓ Done!';
                }
            });
        });
}

// Initialize: fetch CSV then render
(async function init() {
    try {
        setStatus('Loading program…');
        const csvText = await loadCSV('gym.csv');
        const exercises = parseCSV(csvText);
        // Clear previous content and status
        workoutsContainer.innerHTML = '';
        setStatus('');
        renderWorkouts(exercises);
    } catch (err) {
        console.error(err);
        setStatus(
            'Could not load gym.csv. If you opened this file directly (file://), please run a local server and open via http:// instead. Example: <code>python3 -m http.server 8000</code> then visit <code>http://localhost:8000/index.html</code>.',
            'error'
        );
    }
})();
