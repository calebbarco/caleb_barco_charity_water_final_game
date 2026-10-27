const LEADERBOARD_STORAGE_KEY = 'waterDigAttempts';
const leaderboardBody = document.querySelector('#leaderboard-body');
const tableWrap = document.querySelector('#leaderboard-table-wrap');
const emptyState = document.querySelector('#empty-state');

function formatDate(value) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(value));
}

function addCell(row, text) {
    const cell = document.createElement('td');
    cell.textContent = text;
    row.append(cell);
    return cell;
}

function showAttempts() {
    let attempts = [];

    try {
        const savedAttempts = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY) || '[]');
        if (Array.isArray(savedAttempts)) {
            attempts = savedAttempts.filter((attempt) => attempt
                && Number.isFinite(Date.parse(attempt.playedAt))
                && ['depth', 'people', 'score', 'gallons'].every((value) => Number.isFinite(attempt[value])));
        }
    } catch (error) {
        console.warn('Your local leaderboard could not be read.', error);
    }

    attempts = attempts.slice(-20).reverse();
    emptyState.hidden = attempts.length > 0;
    tableWrap.hidden = attempts.length === 0;

    attempts.forEach((attempt, index) => {
        const row = document.createElement('tr');
        addCell(row, `#${index + 1}`);

        const resultCell = addCell(row, '');
        const resultLabel = document.createElement('span');
        resultLabel.className = attempt.completed ? 'attempt-result is-complete' : 'attempt-result';
        resultLabel.textContent = attempt.completed ? 'Surface reached' : 'Game over';
        resultCell.append(resultLabel);

        addCell(row, formatDate(attempt.playedAt));
        addCell(row, `${attempt.depth.toLocaleString()} ft`);
        addCell(row, `${attempt.gallons.toLocaleString()} gal`);
        addCell(row, attempt.people.toLocaleString());
        addCell(row, attempt.score.toLocaleString());
        leaderboardBody.append(row);
    });
}

showAttempts();
