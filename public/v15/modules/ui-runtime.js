(() => {
  'use strict';

  const locks = new Set();

  function beginModalAction(button, savingText = 'Đang lưu...') {
    if (!button) return { button: null, modal: null, controls: [] };
    if (button.dataset.saving === '1') return null;

    const modalEl = button.closest('.modal');
    button.dataset.saving = '1';
    button.dataset.idleText = button.textContent || '';
    button.style.minWidth = `${Math.ceil(button.getBoundingClientRect().width)}px`;
    button.disabled = true;
    button.classList.add('isSaving');
    button.setAttribute('aria-busy', 'true');
    button.textContent = savingText;

    const controls = [];
    if (modalEl) {
      modalEl.dataset.saving = '1';
      modalEl.setAttribute('aria-busy', 'true');
      if (modalEl.querySelector('[data-staff-modal], [data-student-transfer-modal]')) {
        modalEl.querySelectorAll('input,select,textarea,button').forEach((el) => {
          if (el === button) return;
          controls.push({ el, disabled: !!el.disabled });
          el.disabled = true;
        });
      }
    }

    return { button, modal: modalEl, controls };
  }

  function endModalAction(action) {
    const button = action?.button;
    const modalEl = action?.modal;

    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.idleText || button.textContent || '';
      delete button.dataset.saving;
      delete button.dataset.idleText;
      button.style.minWidth = '';
      button.classList.remove('isSaving');
      button.removeAttribute('aria-busy');
    }

    (action?.controls || []).forEach(({ el, disabled }) => {
      if (el?.isConnected) el.disabled = disabled;
    });

    if (modalEl) {
      delete modalEl.dataset.saving;
      modalEl.removeAttribute('aria-busy');
    }
  }

  function beginLockedAction(key, button, savingText = 'Đang lưu...') {
    const lockKey = String(key || 'ui-action');
    if (locks.has(lockKey)) return null;
    locks.add(lockKey);

    const action = beginModalAction(button, savingText);
    if (!action) {
      locks.delete(lockKey);
      return null;
    }

    return { ...action, lockKey };
  }

  function endLockedAction(action) {
    if (action?.lockKey) locks.delete(action.lockKey);
    endModalAction(action);
  }

  function isLocked(key) {
    return locks.has(String(key || 'ui-action'));
  }

  window.MsUiAction = Object.freeze({
    beginModalAction,
    endModalAction,
    beginLockedAction,
    endLockedAction,
    isLocked
  });
})();
