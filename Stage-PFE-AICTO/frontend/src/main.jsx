import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from "@material-tailwind/react"
import App from './App'
import './styles/index.css'
import './styles/rtl.css'
import './styles/admin.css'
import './styles/profile.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <Suspense fallback={<div className="loading-screen">Loading...</div>}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </Suspense>
    </ThemeProvider>
  </React.StrictMode>,
)