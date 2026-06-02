const form = document.querySelector('#setup-form')
const input = document.querySelector('#accounts-url')
const button = document.querySelector('button')
const error = document.querySelector('#error')

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  error.textContent = ''
  button.disabled = true
  button.textContent = 'Connecting...'

  try {
    await window.openseDesktop.configure(input.value)
  } catch (err) {
    error.textContent = err instanceof Error ? err.message : 'Unable to connect.'
    button.disabled = false
    button.textContent = 'Connect'
  }
})
