// Global State
let currentQuestionIndex = 0;
let userState = {
    answers: {}, // { id: [selectedIndices] }
    results: {}, // { id: 'correct' | 'wrong' }
    isSubmitted: false
};

// Helper
const getOptionLabel = (index) => String.fromCharCode(65 + index);

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 1. Initialize Info
    document.getElementById('total-count').textContent = quizData.length;
    renderQuestionGrid();
    loadQuestion(0);

    // 2. Event Listeners
    document.getElementById('prev-btn').addEventListener('click', () => navigate(-1));
    document.getElementById('next-btn').addEventListener('click', () => navigate(1));
    document.getElementById('check-btn').addEventListener('click', submitCurrentAnswer);
    document.getElementById('submit-exam-btn').addEventListener('click', finishExam);
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('result-modal').style.display = 'none';
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') navigate(-1);
        if (e.key === 'ArrowRight') navigate(1);
    });
}

function renderQuestionGrid() {
    const grid = document.getElementById('question-grid');
    grid.innerHTML = '';
    
    quizData.forEach((q, index) => {
        const cell = document.createElement('div');
        cell.className = 'q-cell';
        cell.textContent = index + 1;
        cell.dataset.index = index;
        cell.id = `q-cell-${index}`;
        
        cell.addEventListener('click', () => {
            currentQuestionIndex = index;
            loadQuestion(index);
        });
        
        grid.appendChild(cell);
    });
}

function updateQuestionGridStatus(index) {
    const cell = document.getElementById(`q-cell-${index}`);
    if (!cell) return;

    // Reset base classes
    cell.className = 'q-cell';
    
    // Add Active
    if (index === currentQuestionIndex) {
        cell.classList.add('active');
    }

    const questionId = quizData[index].id;
    const hasAnswer = userState.answers[questionId] && userState.answers[questionId].length > 0;
    const result = userState.results[questionId];

    if (result === 'correct') {
        cell.classList.add('correct');
    } else if (result === 'wrong') {
        cell.classList.add('wrong');
    } else if (hasAnswer) {
        cell.classList.add('answered');
    }
}

function updateAllGridStatus() {
    quizData.forEach((_, i) => updateQuestionGridStatus(i));
}

function loadQuestion(index) {
    if (index < 0 || index >= quizData.length) return;
    
    currentQuestionIndex = index;
    const question = quizData[index];
    
    // Update Grid Highlight
    updateAllGridStatus();

    // 1. Set Type Badge
    const typeBadge = document.getElementById('question-type');
    let typeText = '未知题型';
    if (question.type === 'single') typeText = '单选题';
    if (question.type === 'multiple') typeText = '多选题';
    if (question.type === 'boolean') typeText = '判断题';
    typeBadge.textContent = `${index + 1}. ${typeText}`;

    // 2. Set Text
    document.getElementById('question-text').textContent = question.question;

    // 3. Render Options
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    const savedSelection = userState.answers[question.id] || [];
    const isChecked = !!userState.results[question.id];

    question.options.forEach((optText, i) => {
        const row = document.createElement('div');
        row.className = 'option-row';
        
        // Selection State
        if (savedSelection.includes(i)) {
            row.classList.add('selected');
        }

        // Result Coloring (if checked)
        if (isChecked) {
            const label = getOptionLabel(i);
            const isCorrectOption = question.answer.includes(label);
            const isSelected = savedSelection.includes(i);

            if (isCorrectOption) {
                row.classList.add('correct-highlight');
            } else if (isSelected && !isCorrectOption) {
                row.classList.add('wrong-highlight');
            }
            row.style.cursor = 'default';
        } else {
            row.addEventListener('click', () => handleOptionClick(i, question));
        }

        row.innerHTML = `
            <span class="opt-label">${getOptionLabel(i)}</span>
            <div class="opt-text">${optText}</div>
        `;
        container.appendChild(row);
    });

    // 4. Analysis Box
    const analysisBox = document.getElementById('analysis-box');
    const analysisTitle = document.getElementById('analysis-title');
    const analysisText = document.getElementById('analysis-text');

    if (isChecked) {
        analysisBox.classList.add('show');
        const isCorrect = userState.results[question.id] === 'correct';
        
        analysisBox.className = `analysis-box show ${isCorrect ? 'correct' : 'wrong'}`;
        analysisTitle.innerHTML = isCorrect 
            ? '✅ 回答正确' 
            : `❌ 回答错误 (正确答案: ${question.answer.join('')})`;
        analysisText.textContent = question.explanation || '暂无解析';
        
        // Hide Check Button if already checked
        document.getElementById('check-btn').style.display = 'none';
    } else {
        analysisBox.classList.remove('show');
        document.getElementById('check-btn').style.display = 'block';
    }

    // 5. Update Nav Buttons
    document.getElementById('prev-btn').disabled = index === 0;
    document.getElementById('next-btn').disabled = index === quizData.length - 1;
}

function handleOptionClick(optionIndex, question) {
    let selection = userState.answers[question.id] || [];

    if (question.type === 'single' || question.type === 'boolean') {
        selection = [optionIndex];
    } else {
        // Toggle
        const idx = selection.indexOf(optionIndex);
        if (idx > -1) {
            selection.splice(idx, 1);
        } else {
            selection.push(optionIndex);
        }
    }

    userState.answers[question.id] = selection;
    
    // Refresh UI (keep selection visible)
    loadQuestion(currentQuestionIndex);
    
    // Update answered count
    updateStats();
}

function submitCurrentAnswer() {
    const question = quizData[currentQuestionIndex];
    const selection = userState.answers[question.id] || [];

    if (selection.length === 0) {
        alert('请先选择一个选项');
        return;
    }

    // Convert to labels and compare
    const userLabels = selection.map(i => getOptionLabel(i)).sort();
    const correctLabels = question.answer.sort();
    
    const isCorrect = JSON.stringify(userLabels) === JSON.stringify(correctLabels);
    
    userState.results[question.id] = isCorrect ? 'correct' : 'wrong';
    
    loadQuestion(currentQuestionIndex); // Refresh to show result
    updateStats();
}

function navigate(direction) {
    const newIndex = currentQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < quizData.length) {
        loadQuestion(newIndex);
    }
}

function updateStats() {
    const totalAnswered = Object.keys(userState.answers).length;
    document.getElementById('answered-count').textContent = totalAnswered;
    updateAllGridStatus();
}

function finishExam() {
    const total = quizData.length;
    let correct = 0;
    let wrong = 0;
    let unassigned = 0;

    // Auto-grade remaining items if in exam mode? 
    // For now, just count what has been checked (results existing)
    // OR we can auto-submit everything that has an answer but no result.
    
    quizData.forEach(q => {
        // If user answered but didn't click "Check", let's grade it now
        if (userState.answers[q.id] && !userState.results[q.id]) {
            const selection = userState.answers[q.id];
            const userLabels = selection.map(i => getOptionLabel(i)).sort();
            const correctLabels = q.answer.sort();
            const isCorrect = JSON.stringify(userLabels) === JSON.stringify(correctLabels);
            userState.results[q.id] = isCorrect ? 'correct' : 'wrong';
        }

        if (userState.results[q.id] === 'correct') correct++;
        else if (userState.results[q.id] === 'wrong') wrong++;
    });

    // Show Modal
    const score = Math.round((correct / total) * 100);
    document.getElementById('final-score').textContent = score;
    document.getElementById('correct-count').textContent = correct;
    document.getElementById('wrong-count').textContent = wrong;
    document.getElementById('accuracy-rate').textContent = score + '%';
    
    document.getElementById('result-modal').style.display = 'flex';
    
    // Refresh grid to show all new results
    updateAllGridStatus();
}
