// Application state
let currentItinerary = null;

// DOM elements
const formSection = document.getElementById('form-section');
const loadingSection = document.getElementById('loading-section');
const errorSection = document.getElementById('error-section');
const resultsSection = document.getElementById('results-section');
const itineraryForm = document.getElementById('itinerary-form');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const durationInput = document.getElementById('duration');
const retryBtn = document.getElementById('retry-btn');
const newItineraryBtn = document.getElementById('new-itinerary-btn');
const errorMessage = document.getElementById('error-message');

// Activity type configuration
const activityConfig = {
    transport: { color: '#3B82F6', icon: '🚗' },
    food: { color: '#EF4444', icon: '🍽️' },
    accommodation: { color: '#8B5CF6', icon: '🏨' },
    culture: { color: '#10B981', icon: '🏛️' },
    nature: { color: '#059669', icon: '🌿' },
    art: { color: '#EC4899', icon: '🎨' },
    adventure: { color: '#DC2626', icon: '🏔️' },
    shopping: { color: '#F59E0B', icon: '🛍️' }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing app');
    initializeApp();
});

function initializeApp() {
    console.log('Initializing application...');

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    startDateInput.min = today;
    endDateInput.min = today;

    // Event listeners
    startDateInput.addEventListener('change', calculateDuration);
    endDateInput.addEventListener('change', calculateDuration);
    startDateInput.addEventListener('input', calculateDuration);
    endDateInput.addEventListener('input', calculateDuration);

    // Form submission with multiple event types for reliability
    itineraryForm.addEventListener('submit', handleFormSubmit);

    // Button event listeners
    if (retryBtn) retryBtn.addEventListener('click', handleRetry);
    if (newItineraryBtn) newItineraryBtn.addEventListener('click', handleNewItinerary);

    // Set demo values for easier testing
    setDemoValues();
}

function setDemoValues() {
    // Pre-fill form with demo data for easier testing
    document.getElementById('current-location').value = 'Delhi, India';
    document.getElementById('destination').value = 'Meghalaya (Shillong), India';
    document.getElementById('start-date').value = '2025-09-01';
    document.getElementById('end-date').value = '2025-09-07';
    document.getElementById('travelers').value = '2';

    // Check some interests
    document.querySelector('input[name="interests"][value="culture"]').checked = true;
    document.querySelector('input[name="interests"][value="nature"]').checked = true;
    document.querySelector('input[name="interests"][value="art"]').checked = true;

    // Select luxury budget
    document.querySelector('input[name="budget"][value="luxury"]').checked = true;

    // Calculate duration
    calculateDuration();
}

function calculateDuration() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeDiff = end.getTime() - start.getTime();
        const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (dayDiff > 0) {
            durationInput.value = `${dayDiff} day${dayDiff > 1 ? 's' : ''}`;

            // Update end date minimum to be after start date
            endDateInput.min = startDate;
        } else if (dayDiff === 0) {
            durationInput.value = '1 day';
        } else {
            durationInput.value = '';
            // Reset end date if it's before start date
            endDateInput.value = '';
        }
    } else {
        durationInput.value = '';
    }
}

function handleFormSubmit(event) {
    event.preventDefault();
    console.log('Form submitted');

    const formData = collectFormData();
    if (validateFormData(formData)) {
        submitItineraryRequest(formData);
    }
}

function collectFormData() {
    const formData = new FormData(itineraryForm);
    const data = {};

    // Collect basic fields
    data.current_location = formData.get('current_location');
    data.destination = formData.get('destination');
    data.start_date = formData.get('start_date');
    data.end_date = formData.get('end_date');
    data.duration = formData.get('duration');
    data.travelers = parseInt(formData.get('travelers'));
    data.budget = formData.get('budget');

    // Collect interests array
    data.interests = [];
    const interestInputs = document.querySelectorAll('input[name="interests"]:checked');
    interestInputs.forEach(input => {
        data.interests.push(input.value);
    });

    console.log('Collected form data:', data);
    return data;
}

function validateFormData(data) {
    const requiredFields = ['current_location', 'destination', 'start_date', 'end_date', 'duration', 'budget'];

    for (const field of requiredFields) {
        if (!data[field] || data[field].toString().trim() === '') {
            showError(`Please fill in the ${field.replace('_', ' ')} field.`);
            return false;
        }
    }

    if (data.interests.length === 0) {
        showError('Please select at least one interest.');
        return false;
    }

    if (data.travelers < 1 || data.travelers > 10) {
        showError('Number of travelers must be between 1 and 10.');
        return false;
    }

    return true;
}

function submitItineraryRequest(data) {
    console.log('Submitting request with data:', data);

    // Show loading state
    showSection('loading');

    // Make API request
    fetch('http://localhost:8000/api/generate-itinerary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    })
    .then(result => {
        console.log('API response:', result);

        if (result.success) {
            currentItinerary = result;
            displayItinerary(result);
            showSection('results');
        } else {
            throw new Error(result.message || 'Failed to generate itinerary');
        }
    })
    .catch(error => {
        console.error('Error:', error);

        let errorMsg = 'Sorry, we couldn\'t generate your itinerary at the moment. ';

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMsg += 'Please make sure your backend server is running on http://localhost:8000';
        } else if (error.message.includes('HTTP error')) {
            errorMsg += `Server responded with an error (${error.message})`;
        } else {
            errorMsg += error.message;
        }

        showError(errorMsg);
    });
}

function showSection(section) {
    // Hide all sections
    formSection.style.display = 'none';
    loadingSection.style.display = 'none';
    errorSection.style.display = 'none';
    resultsSection.style.display = 'none';

    // Show requested section
    switch (section) {
        case 'form':
            formSection.style.display = 'block';
            break;
        case 'loading':
            loadingSection.style.display = 'block';
            break;
        case 'error':
            errorSection.style.display = 'block';
            break;
        case 'results':
            resultsSection.style.display = 'block';
            break;
    }
}

function showError(message) {
    errorMessage.textContent = message;
    showSection('error');
}

function handleRetry() {
    showSection('form');
}

function handleNewItinerary() {
    showSection('form');
    // Optionally reset form
    // itineraryForm.reset();
    // setDemoValues();
}

function displayItinerary(itinerary) {
    console.log('Displaying itinerary:', itinerary);

    // Update trip summary
    document.getElementById('trip-destination').textContent = itinerary.destination;
    document.getElementById('trip-duration').textContent = itinerary.duration;
    document.getElementById('trip-budget').textContent = itinerary.budget || 'Not specified';

    // Display daily itinerary
    displayDailyItinerary(itinerary.days);

    // Display budget breakdown
    displayBudgetBreakdown(itinerary.budget_breakdown);
}

function displayDailyItinerary(days) {
    const dailyItineraryContainer = document.getElementById('daily-itinerary');
    dailyItineraryContainer.innerHTML = '';

    days.forEach(day => {
        const dayCard = createDayCard(day);
        dailyItineraryContainer.appendChild(dayCard);
    });
}

function createDayCard(day) {
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card card';

    // Create day header
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.setAttribute('role', 'button');
    dayHeader.setAttribute('tabindex', '0');
    dayHeader.setAttribute('aria-expanded', 'false');

    dayHeader.innerHTML = `
        <div class="day-title-section">
            <div class="day-number">${day.day}</div>
            <div class="day-title">${day.title}</div>
        </div>
        <div class="day-cost">
            <span>${day.total_cost}</span>
            <i class="fas fa-chevron-down expand-icon"></i>
        </div>
    `;

    // Create day content
    const dayContent = document.createElement('div');
    dayContent.className = 'day-content';
    dayContent.style.display = 'none';

    const activitiesList = document.createElement('div');
    activitiesList.className = 'activities-list';

    day.activities.forEach(activity => {
        const activityItem = createActivityItem(activity);
        activitiesList.appendChild(activityItem);
    });

    dayContent.appendChild(activitiesList);

    // Add click handler for expand/collapse
    dayHeader.addEventListener('click', () => {
        const isExpanded = dayHeader.getAttribute('aria-expanded') === 'true';
        dayHeader.setAttribute('aria-expanded', !isExpanded);
        dayContent.style.display = isExpanded ? 'none' : 'block';
    });

    // Add keyboard handler
    dayHeader.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dayHeader.click();
        }
    });

    dayCard.appendChild(dayHeader);
    dayCard.appendChild(dayContent);

    return dayCard;
}

function createActivityItem(activity) {
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.setAttribute('data-activity-type', activity.type);

    const config = activityConfig[activity.type] || { color: '#6B7280', icon: '📍' };

    activityItem.innerHTML = `
        <div class="activity-time">${activity.time}</div>
        <div class="activity-details">
            <div class="activity-name">${activity.activity}</div>
            <div class="activity-meta">
                <span class="activity-type" data-type="${activity.type}">
                    ${config.icon} ${activity.type}
                </span>
                ${activity.location ? `
                    <span class="activity-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${activity.location}
                    </span>
                ` : ''}
                <span class="activity-cost">${activity.cost}</span>
            </div>
        </div>
    `;

    return activityItem;
}

function displayBudgetBreakdown(budgetBreakdown) {
    const budgetContainer = document.getElementById('budget-categories');
    budgetContainer.innerHTML = '';

    if (!budgetBreakdown) {
        budgetContainer.innerHTML = '<p>Budget breakdown not available</p>';
        return;
    }

    Object.entries(budgetBreakdown).forEach(([category, amount]) => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'budget-category';

        categoryElement.innerHTML = `
            <span class="category-name">${category}</span>
            <span class="category-amount">${amount}</span>
        `;

        budgetContainer.appendChild(categoryElement);
    });
}

// Error handling for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});