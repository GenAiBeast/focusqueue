function Toast({ toast }) {
  if (!toast) {
    return null
  }

  return (
    <aside className={`toast toast-${toast.type}`} role="status" aria-live="polite">
      {toast.message}
    </aside>
  )
}

export default Toast
