const toast = document.querySelector('#toast');
const syncBtn = document.querySelector('#syncBtn');
const newRule = document.querySelector('#newRule');

function showToast(message) {
  if (!toast) return;
  toast.firstChild.textContent = message + ' ';
  toast.classList.add('show');
  window.clearTimeout(window.replyFlowToast);
  window.replyFlowToast = window.setTimeout(() => toast.classList.remove('show'), 3000);
}

function addAuthControl() {
  const actions = document.querySelector('.top-actions');
  if (!actions) return null;
  const button = document.createElement('button');
  button.className = 'help auth-control';
  button.type = 'button';
  button.textContent = 'Connect YouTube';
  actions.prepend(button);
  return button;
}

async function loadYouTube() {
  const authButton = addAuthControl();
  try {
    const response = await fetch('/api/me');
    const data = await response.json();
    if (!data.authenticated) {
      authButton?.addEventListener('click', () => { window.location.href = '/auth/google'; });
      return;
    }
    if (authButton) {
      authButton.textContent = data.channel?.title || 'YouTube connected';
      authButton.addEventListener('click', async () => {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.reload();
      });
    }
    await syncComments(false);
  } catch (error) {
    console.warn('YouTube integration unavailable:', error);
  }
}

async function syncComments(showResult = true) {
  if (!syncBtn) return;
  syncBtn.disabled = true;
  syncBtn.innerHTML = '<span>↻</span> Syncing…';
  try {
    const response = await fetch('/api/comments');
    if (response.status === 401) throw new Error('Connect YouTube before syncing comments.');
    const data = await response.json();
    window.replyFlowComments = data.comments || [];
    if (showResult) showToast(`${window.replyFlowComments.length} comments synced successfully`);
  } catch (error) {
    if (showResult) showToast(error.message);
  } finally {
    syncBtn.disabled = false;
    syncBtn.innerHTML = '<span>↻</span> Sync comments';
  }
}

syncBtn?.addEventListener('click', () => syncComments(true));
newRule?.addEventListener('click', () => showToast('Rule builder is ready to configure'));
document.querySelectorAll('.reply-action').forEach((button) => button.addEventListener('click', () => showToast('Reply composer opened')));
document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'));
  link.classList.add('active');
}));

loadYouTube();
