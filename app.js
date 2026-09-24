const toast = document.querySelector('#toast');
const syncBtn = document.querySelector('#syncBtn');
const newRule = document.querySelector('#newRule');

function showToast(message) {
  toast.firstChild.textContent = message + ' ';
  toast.classList.add('show');
  window.clearTimeout(window.replyFlowToast);
  window.replyFlowToast = window.setTimeout(() => toast.classList.remove('show'), 3000);
}

syncBtn.addEventListener('click', () => {
  syncBtn.disabled = true;
  syncBtn.innerHTML = '<span>↻</span> Syncing…';
  window.setTimeout(() => {
    syncBtn.disabled = false;
    syncBtn.innerHTML = '<span>↻</span> Sync comments';
    showToast('Comments synced successfully');
  }, 850);
});

newRule.addEventListener('click', () => showToast('Rule builder is ready to configure'));

document.querySelectorAll('.reply-action').forEach((button) => {
  button.addEventListener('click', () => showToast('Reply composer opened'));
});

document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  });
});
