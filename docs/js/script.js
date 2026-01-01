document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {navigator.clipboard.writeText(btn.dataset.copy);
            btn.textContent = 'Copied!';
            setTimeout(() => (btn.textContent = 'Copy'), 1500);
        });
});