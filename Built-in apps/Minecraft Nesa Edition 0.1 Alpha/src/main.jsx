import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Global keyboard state
window.keys = {}

document.addEventListener('keydown', (e) => {
  window.keys[e.code] = true
})

document.addEventListener('keyup', (e) => {
  window.keys[e.code] = false
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
