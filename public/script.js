let questions = [];
let customQuestions = [];
let isCustomSurvey = false;

// Load questions when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    loadQuestions();
});

// Theme functionality
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Add a subtle animation effect
    document.body.style.transition = 'all 0.3s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 300);
}

async function loadQuestions() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const surveyType = urlParams.get('type') || 'quick';
        
        // Update page title based on survey type
        const titles = {
            quick: 'Quick Survey',
            details: 'Detailed Survey', 
            custom: 'Custom Q&A'
        };
        document.querySelector('h1').textContent = titles[surveyType] || 'Survey';
        
        if (surveyType === 'custom') {
            isCustomSurvey = true;
            showCustomBuilder();
        } else {
            const response = await fetch(`/api/questions?type=${surveyType}`);
            questions = await response.json();
            renderQuestions();
        }
    } catch (error) {
        showMessage('Error loading questions', 'error');
    }
}

function showCustomBuilder() {
    document.getElementById('custom-builder').style.display = 'block';
    document.getElementById('surveyForm').style.display = 'none';
    
    document.getElementById('add-question-btn').addEventListener('click', addCustomQuestion);
    document.getElementById('start-custom-survey').addEventListener('click', submitCustomQA);
}

function addCustomQuestion() {
    const questionsList = document.getElementById('custom-questions-list');
    const questionIndex = customQuestions.length;
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'custom-question-builder';
    questionDiv.innerHTML = `
        <div class="question-builder-header">
            <h4>Q&A ${questionIndex + 1}</h4>
            <button type="button" class="remove-question" onclick="removeCustomQuestion(${questionIndex})">×</button>
        </div>
        <input type="text" placeholder="Enter your question" class="question-input" required>
        <textarea placeholder="Enter your answer" class="answer-input" required rows="3"></textarea>
    `;
    
    questionsList.appendChild(questionDiv);
    customQuestions.push({ id: Date.now() + questionIndex });
    updateStartButton();
}

window.removeCustomQuestion = function(index) {
    const questionsList = document.getElementById('custom-questions-list');
    questionsList.children[index].remove();
    customQuestions.splice(index, 1);
    updateQuestionNumbers();
    updateStartButton();
}

function updateQuestionNumbers() {
    const questionDivs = document.querySelectorAll('.custom-question-builder');
    questionDivs.forEach((div, index) => {
        div.querySelector('h4').textContent = `Q&A ${index + 1}`;
    });
}

function updateStartButton() {
    const startBtn = document.getElementById('start-custom-survey');
    startBtn.style.display = customQuestions.length > 0 ? 'inline-block' : 'none';
}

function submitCustomQA() {
    const questionBuilders = document.querySelectorAll('.custom-question-builder');
    const responses = [];
    
    questionBuilders.forEach((builder, index) => {
        const questionText = builder.querySelector('.question-input').value.trim();
        const answerText = builder.querySelector('.answer-input').value.trim();
        
        if (questionText && answerText) {
            responses.push({
                question_id: customQuestions[index].id,
                question_text: questionText,
                answer: answerText
            });
        }
    });
    
    if (responses.length === 0) {
        showMessage('Please add at least one question with answer', 'error');
        return;
    }
    
    fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, isCustomSurvey: true })
    })
    .then(response => response.json())
    .then(result => {
        showMessage('🎉 Custom Q&A submitted successfully! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'summary.html';
        }, 2000);
    })
    .catch(error => {
        showMessage('Error submitting Q&A. Please try again.', 'error');
    });
}

function renderQuestions() {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.style.animationDelay = `${index * 0.1}s`;
        
        let inputHTML = '';
        if (question.question_type === 'multiple_choice' && question.options) {
            const options = JSON.parse(question.options);
            inputHTML = `
                <div class="radio-group">
                    ${options.map((option, i) => `
                        <label class="radio-option">
                            <input type="radio" name="question-${question.id}" value="${option}" required>
                            <span class="radio-text">${option}</span>
                        </label>
                    `).join('')}
                </div>
            `;
        } else {
            inputHTML = `
                <div class="input-container">
                    <textarea 
                        id="answer-${question.id}" 
                        placeholder="Share your thoughts..."
                        required
                        maxlength="500"
                    ></textarea>
                    <div class="input-feedback">
                        <span class="char-count">0/500</span>
                        <span class="input-status"></span>
                    </div>
                </div>
            `;
        }
        
        questionDiv.innerHTML = `
            <h3>Question ${index + 1}</h3>
            <p>${question.question_text}</p>
            ${inputHTML}
        `;
        container.appendChild(questionDiv);
        
        // Add entrance animation
        setTimeout(() => {
            questionDiv.style.opacity = '1';
            questionDiv.style.transform = 'translateY(0)';
        }, index * 100);
        
        // Add interactive features to text areas
        const textarea = questionDiv.querySelector('textarea');
        if (textarea) {
            addTextareaInteractivity(textarea, question.id);
        }
    });

    // Enable submit button and add event listener
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    document.getElementById('surveyForm').addEventListener('submit', handleSubmit);
}

async function handleSubmit(event) {
    event.preventDefault();
    
    const responses = [];
    let allAnswered = true;

    questions.forEach(question => {
        let answer = '';
        
        if (question.question_type === 'multiple_choice') {
            const selectedRadio = document.querySelector(`input[name="question-${question.id}"]:checked`);
            answer = selectedRadio ? selectedRadio.value : '';
        } else {
            answer = document.getElementById(`answer-${question.id}`).value.trim();
        }
        
        if (!answer) {
            allAnswered = false;
            return;
        }
        responses.push({
            question_id: question.id,
            question_text: question.question_text,
            answer: answer
        });
    });

    if (!allAnswered) {
        showMessage('Please answer all questions', 'error');
        return;
    }

    // Show loading state
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ responses, isCustomSurvey })
        });

        const result = await response.json();
        
        if (response.ok) {
            showMessage('🎉 Survey submitted successfully! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'summary.html';
            }, 2000);
        } else {
            showMessage(result.error || 'Error submitting survey', 'error');
        }
    } catch (error) {
        showMessage('Error submitting survey. Please try again.', 'error');
    } finally {
        // Reset button state
        setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }, 1000);
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.style.display = 'block';
    
    // Add success animation
    if (type === 'success') {
        confetti();
    }
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Simple confetti effect for success
function confetti() {
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confettiPiece = document.createElement('div');
            confettiPiece.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}vw;
                top: -10px;
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                animation: confettiFall 3s linear forwards;
            `;
            
            document.body.appendChild(confettiPiece);
            
            setTimeout(() => {
                confettiPiece.remove();
            }, 3000);
        }, i * 50);
    }
}

// Add confetti animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes confettiFall {
        to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }
    
    .question {
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.5s ease;
    }
    
    .radio-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 15px;
    }
    
    .radio-option {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: var(--bg-secondary);
        border: 2px solid var(--border-color);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .radio-option:hover {
        border-color: var(--accent);
        background: var(--bg-primary);
    }
    
    .radio-option input[type="radio"] {
        margin-right: 12px;
        accent-color: var(--accent);
    }
    
    .radio-text {
        color: var(--text-primary);
        font-weight: 500;
    }
    
    .input-container {
        position: relative;
    }
    
    .input-container textarea {
        width: 100%;
        min-height: 100px;
        max-height: 200px;
        resize: none;
        transition: all 0.3s ease;
        border: 2px solid var(--border-color);
        border-radius: 12px;
        padding: 15px;
        font-family: inherit;
        background: var(--bg-primary);
        color: var(--text-primary);
    }
    
    .input-container textarea:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        transform: translateY(-2px);
    }
    
    .input-container textarea.typing {
        border-color: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }
    
    .input-feedback {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
        font-size: 0.85rem;
    }
    
    .char-count {
        color: var(--text-secondary);
        transition: color 0.3s ease;
    }
    
    .char-count.warning {
        color: #f59e0b;
    }
    
    .char-count.danger {
        color: #ef4444;
    }
    
    .input-status {
        font-weight: 500;
        opacity: 0;
        transition: all 0.3s ease;
    }
    
    .input-status.show {
        opacity: 1;
    }
    
    .input-status.good {
        color: #10b981;
    }
    
    .input-status.excellent {
        color: #8b5cf6;
    }
    
    /* Survey page contrast text */
    .survey-page {
        --text-primary: var(--text-contrast);
        --text-secondary: var(--text-contrast);
    }
    
    .survey-page h1,
    .survey-page h3,
    .survey-page p,
    .survey-page .radio-text {
        color: var(--text-contrast) !important;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    }
    
    .survey-page .subtitle {
        color: var(--text-contrast) !important;
        opacity: 0.9;
    }
    
    /* Custom Survey Builder Styles */
    .builder-section {
        background: var(--card-bg);
        padding: 2rem;
        border-radius: 20px;
        margin-bottom: 2rem;
        border: 1px solid var(--border-color);
    }
    
    .builder-section h3 {
        color: var(--text-on-white) !important;
        text-shadow: none !important;
        margin-bottom: 0.5rem;
    }
    
    .builder-section p {
        color: var(--text-secondary-on-white) !important;
        text-shadow: none !important;
        margin-bottom: 2rem;
    }
    
    .custom-question-builder {
        background: var(--bg-secondary);
        padding: 1.5rem;
        border-radius: 15px;
        margin-bottom: 1.5rem;
        border: 1px solid var(--border-color);
    }
    
    .question-builder-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .question-builder-header h4 {
        color: var(--text-on-white);
        margin: 0;
    }
    
    .remove-question {
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        cursor: pointer;
        font-size: 1.2rem;
    }
    
    .question-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        margin-bottom: 1rem;
        background: var(--bg-primary);
        color: var(--text-on-white);
    }
    
    .answer-type {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .answer-type label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-on-white);
        cursor: pointer;
    }
    
    .options-container {
        margin-top: 1rem;
    }
    
    .option-item {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        align-items: center;
    }
    
    .option-input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-primary);
        color: var(--text-on-white);
    }
    
    .remove-option {
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 25px;
        height: 25px;
        cursor: pointer;
    }
    
    .add-option-btn {
        background: var(--accent);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        margin-top: 0.5rem;
    }
    
    .answer-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        margin-bottom: 1rem;
        background: var(--bg-primary);
        color: var(--text-on-white);
        resize: vertical;
        min-height: 60px;
    }
`;
document.head.appendChild(style);

// Interactive textarea functionality
function addTextareaInteractivity(textarea, questionId) {
    const container = textarea.closest('.input-container');
    const charCount = container.querySelector('.char-count');
    const inputStatus = container.querySelector('.input-status');
    let typingTimer;
    
    // Auto-resize functionality
    function autoResize() {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
    
    // Update character count and status
    function updateFeedback() {
        const length = textarea.value.length;
        const maxLength = parseInt(textarea.getAttribute('maxlength'));
        
        // Update character count
        charCount.textContent = `${length}/${maxLength}`;
        
        // Update character count styling
        charCount.classList.remove('warning', 'danger');
        if (length > maxLength * 0.8) {
            charCount.classList.add('warning');
        }
        if (length > maxLength * 0.95) {
            charCount.classList.add('danger');
        }
        
        // Update input status
        inputStatus.classList.remove('show', 'good', 'excellent');
        if (length > 20) {
            inputStatus.classList.add('show', 'good');
            inputStatus.textContent = 'Good detail!';
        }
        if (length > 100) {
            inputStatus.classList.remove('good');
            inputStatus.classList.add('excellent');
            inputStatus.textContent = 'Excellent feedback!';
        }
        if (length === 0) {
            inputStatus.classList.remove('show');
        }
    }
    
    // Event listeners
    textarea.addEventListener('input', () => {
        autoResize();
        updateFeedback();
        
        // Add typing indicator
        textarea.classList.add('typing');
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            textarea.classList.remove('typing');
        }, 1000);
    });
    
    textarea.addEventListener('focus', () => {
        container.style.transform = 'scale(1.02)';
    });
    
    textarea.addEventListener('blur', () => {
        container.style.transform = 'scale(1)';
        textarea.classList.remove('typing');
    });
    
    // Initialize
    autoResize();
    updateFeedback();
}