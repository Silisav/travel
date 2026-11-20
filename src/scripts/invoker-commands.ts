/**
 * Minimal fallback for Invoker Commands (`command` / `commandfor` on buttons), used to
 * open and close <dialog>s without JS. Native in current Chrome, Firefox and Safari;
 * this only runs where the platform lacks it, and only covers what this site uses.
 */
export function polyfillInvokerCommands() {
  if ('command' in HTMLButtonElement.prototype) return;

  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest('button[commandfor]');
    if (!button) return;
    const target = document.getElementById(button.getAttribute('commandfor') ?? '');
    if (!(target instanceof HTMLDialogElement)) return;

    const command = button.getAttribute('command');
    if (command === 'show-modal' && !target.open) target.showModal();
    else if (command === 'close') target.close();
  });

  // closedby="any" fallback: a click on the dialog's own box (outside its content) closes it.
  document.addEventListener('click', (event) => {
    const dialog = event.target;
    if (dialog instanceof HTMLDialogElement && dialog.getAttribute('closedby') === 'any') {
      dialog.close();
    }
  });
}
