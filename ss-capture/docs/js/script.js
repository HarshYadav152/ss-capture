document.querySelectorAll('.copy-btn').forEach(button => {
  button.addEventListener('click', () => {
    const text = button.getAttribute('data-copy');
    navigator.clipboard.writeText(text);

    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = 'Copy';
    }, 1500);
  });
});
